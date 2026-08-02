#!/usr/bin/env node

const requiredUrlNames = [
  "LOCAL_BACKEND_URL",
  "LOCAL_CUSTOMER_URL",
  "LOCAL_ADMIN_URL",
  "LOCAL_RESTAURANT_URL",
  "LOCAL_DRIVER_URL",
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required; refusing to run a partial lifecycle`);
  }
  return value.replace(/\/$/, "");
}

const urls = Object.fromEntries(
  requiredUrlNames.map((name) => [name, required(name)]),
);
const credentials = {
  customer: {
    email: required("LOCAL_CUSTOMER_EMAIL"),
    password: required("LOCAL_CUSTOMER_PASSWORD"),
  },
  restaurant: {
    email: required("LOCAL_RESTAURANT_EMAIL"),
    password: required("LOCAL_RESTAURANT_PASSWORD"),
  },
  driver: {
    email: required("LOCAL_DRIVER_EMAIL"),
    password: required("LOCAL_DRIVER_PASSWORD"),
  },
  admin: {
    email: required("LOCAL_ADMIN_EMAIL"),
    password: required("LOCAL_ADMIN_PASSWORD"),
  },
};
const runs = Number(process.env.LOCAL_LIFECYCLE_RUNS || "2");
if (!Number.isInteger(runs) || runs < 2) {
  throw new Error("LOCAL_LIFECYCLE_RUNS must be an integer >= 2");
}

function unwrap(payload) {
  return payload?.data ?? payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(origin, path, options = {}) {
  const headers = {
    ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
  };
  const response = await fetch(`${origin}/api${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { text };
  }
  return { status: response.status, payload };
}

function expectStatus(result, expected, label) {
  assert(
    result.status === expected,
    `${label}: expected HTTP ${expected}, received ${result.status}`,
  );
}

function expectOneOfStatus(result, expected, label) {
  assert(
    expected.includes(result.status),
    `${label}: expected HTTP ${expected.join("/")}, received ${result.status}`,
  );
}

async function login(role, email, password, origin) {
  const result = await request(
    origin,
    role === "customer" ? "/auth/customer/login" : "/auth/login",
    {
      method: "POST",
      body:
        role === "customer"
          ? { email, password }
          : { email, password, userType: role },
    },
  );
  expectOneOfStatus(result, [200, 201], `${role} login`);
  const data = unwrap(result.payload);
  const token = data?.access_token ?? data?.accessToken ?? data?.token;
  const user = data?.user ?? data;
  assert(token && token.length > 20, `${role} login returned no access token`);
  assert(user?.id, `${role} login returned no user id`);
  const normalizedRole = String(user.role ?? user.userType ?? "").toUpperCase();
  assert(
    normalizedRole.includes(role === "admin" ? "ADMIN" : role.toUpperCase()),
    `${role} login returned an unexpected role`,
  );
  return { token, user };
}

async function registerOrLoginCustomer() {
  const email =
    process.env.LOCAL_SECOND_CUSTOMER_EMAIL ||
    `local.lifecycle.secondary.customer.${Date.now()}@example.test`;
  const password = required("LOCAL_SECOND_CUSTOMER_PASSWORD");
  const registration = await request(urls.LOCAL_CUSTOMER_URL, "/auth/customer/register", {
    method: "POST",
    body: {
      email,
      password,
      name: "Secondary Local Lifecycle Customer",
      phone: "+43 123 456 790",
      address: "Local Lifecycle Street 2, 1010 Vienna",
    },
  });
  expectOneOfStatus(registration, [201, 401], "secondary customer registration");
  return login("customer", email, password, urls.LOCAL_CUSTOMER_URL);
}

async function registerOrLoginDriver() {
  const email =
    process.env.LOCAL_SECOND_DRIVER_EMAIL ||
    `local.lifecycle.secondary.driver.${Date.now()}@uberfoods.local`;
  const password = required("LOCAL_SECOND_DRIVER_PASSWORD");
  const registration = await request(urls.LOCAL_DRIVER_URL, "/auth/driver/register", {
    method: "POST",
    body: {
      email,
      password,
      name: "Secondary Local Lifecycle Driver",
      phone: "+43 555 123 457",
    },
  });
  expectOneOfStatus(registration, [200, 201, 409], "secondary driver registration");
  return login("driver", email, password, urls.LOCAL_DRIVER_URL);
}

async function verifyFrontendOrigins() {
  const frontendOrigins = [
    ["customer", urls.LOCAL_CUSTOMER_URL],
    ["admin", urls.LOCAL_ADMIN_URL],
    ["restaurant", urls.LOCAL_RESTAURANT_URL],
    ["driver", urls.LOCAL_DRIVER_URL],
  ];
  for (const [name, origin] of frontendOrigins) {
    const page = await fetch(`${origin}/`);
    expectStatus({ status: page.status }, 200, `${name} frontend`);
    const health = await request(origin, "/health");
    expectStatus(health, 200, `${name} frontend backend proxy`);
    const healthData = unwrap(health.payload);
    assert(healthData?.database?.status === "connected", `${name} proxy is not on a connected backend`);
  }

  const directHealth = await request(urls.LOCAL_BACKEND_URL, "/health");
  expectStatus(directHealth, 200, "backend health");
  assert(unwrap(directHealth.payload)?.database?.status === "connected", "backend database is not connected");
}

async function updateRestaurantStatus(orderId, status, restaurant) {
  const result = await request(urls.LOCAL_RESTAURANT_URL, `/orders/${orderId}/status`, {
    method: "PATCH",
    token: restaurant.token,
    body: { status },
  });
  expectStatus(result, 200, `restaurant ${status}`);
  assert(unwrap(result.payload)?.status === status, `restaurant did not set ${status}`);
  return result;
}

async function updateDriverStatus(orderId, driver, status) {
  const result = await request(
    urls.LOCAL_DRIVER_URL,
    `/drivers/${driver.user.id}/orders/${orderId}/status`,
    { method: "PUT", token: driver.token, body: { status } },
  );
  expectStatus(result, 200, `driver ${status}`);
  assert(unwrap(result.payload)?.status === status, `driver did not set ${status}`);
  return result;
}

async function createOrder(customer, restaurantId, dishId, runNumber) {
  const result = await request(urls.LOCAL_CUSTOMER_URL, "/orders", {
    method: "POST",
    token: customer.token,
    body: {
      customerId: customer.user.id,
      restaurantId,
      items: [{ dishId, quantity: 2 }],
      deliveryAddress: `Local Lifecycle Run ${runNumber}, 1010 Vienna`,
    },
  });
  expectOneOfStatus(result, [200, 201], `customer creates order run ${runNumber}`);
  const order = unwrap(result.payload);
  assert(order?.id, `customer create returned no order id for run ${runNumber}`);
  assert(order.status === "PENDING", `new order status is ${order.status}, expected PENDING`);
  assert(order.customerId === customer.user.id, "created order customer ownership mismatch");
  assert(order.restaurantId === restaurantId, "created order restaurant ownership mismatch");
  assert(Number(order.totalAmount) >= 10, "created order did not meet the minimum total");
  return order;
}

async function runNegativeChecks({ order, blockedOrder, customer, secondaryCustomer, restaurant, driver, secondaryDriver, admin, foreignRestaurantId }) {
  const createBody = {
    customerId: customer.user.id,
    restaurantId: restaurant.user.id,
    items: [{ dishId: "dish-pizza-pepperoni", quantity: 2 }],
    deliveryAddress: "Negative Local Lifecycle Street, 1010 Vienna",
  };
  for (const [label, token, expected] of [
    ["customer order without token", undefined, 401],
    ["customer order with restaurant token", restaurant.token, 403],
    ["customer order with driver token", driver.token, 403],
    ["customer order with admin token", admin.token, 403],
  ]) {
    const result = await request(urls.LOCAL_CUSTOMER_URL, "/orders", { method: "POST", token, body: createBody });
    expectStatus(result, expected, label);
  }

  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/restaurants/${restaurant.user.id}/orders`), 401, "restaurant route without token");
  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/restaurants/${restaurant.user.id}/orders`, { token: customer.token }), 403, "restaurant route with customer token");
  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/restaurants/${restaurant.user.id}/orders`, { token: driver.token }), 403, "restaurant route with driver token");
  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/restaurants/${foreignRestaurantId}/orders`, { token: restaurant.token }), 403, "foreign restaurant ownership");
  expectStatus(await request(urls.LOCAL_CUSTOMER_URL, `/orders/${order.id}`, { token: secondaryCustomer.token }), 403, "foreign customer ownership");

  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/orders/${order.id}/status`, { method: "PATCH", body: { status: "PREPARING" } }), 401, "restaurant status without token");
  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/orders/${order.id}/status`, { method: "PATCH", token: customer.token, body: { status: "PREPARING" } }), 403, "customer on restaurant status route");
  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/orders/${order.id}/status`, { method: "PATCH", token: driver.token, body: { status: "PREPARING" } }), 403, "driver on restaurant status route");
  expectStatus(await request(urls.LOCAL_RESTAURANT_URL, `/orders/${order.id}/status`, { method: "PATCH", token: restaurant.token, body: { status: "READY_FOR_PICKUP" } }), 409, "invalid restaurant status jump");

  expectStatus(await request(urls.LOCAL_DRIVER_URL, "/drivers/orders/available"), 401, "driver available without token");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, "/drivers/orders/available", { token: customer.token }), 403, "customer on driver route");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, "/drivers/orders/available", { token: restaurant.token }), 403, "restaurant on driver route");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${blockedOrder.id}/accept`, { method: "POST" }), 401, "driver claim without token");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${blockedOrder.id}/accept`, { method: "POST", token: customer.token }), 403, "customer on driver claim route");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${blockedOrder.id}/accept`, { method: "POST", token: restaurant.token }), 403, "restaurant on driver claim route");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${blockedOrder.id}/accept`, { method: "POST", token: driver.token }), 409, "claim before READY_FOR_PICKUP");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${blockedOrder.id}/status`, { method: "PUT", token: driver.token, body: { status: "PICKED_UP" } }), 403, "pickup before assignment/READY_FOR_PICKUP");

  for (const status of ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"]) {
    await updateRestaurantStatus(blockedOrder.id, status, restaurant);
  }
  expectOneOfStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${secondaryDriver.user.id}/orders/${blockedOrder.id}/accept`, { method: "POST", token: secondaryDriver.token }), [200, 201], "secondary driver claims prepared order");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${blockedOrder.id}/status`, { method: "PUT", token: driver.token, body: { status: "PICKED_UP" } }), 403, "foreign driver continues active order");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${secondaryDriver.user.id}/orders/${blockedOrder.id}/status`, { method: "PUT", token: secondaryDriver.token, body: { status: "DELIVERED" } }), 409, "delivery before pickup");
  await updateDriverStatus(blockedOrder.id, secondaryDriver, "PICKED_UP");
  await updateDriverStatus(blockedOrder.id, secondaryDriver, "DELIVERED");
}

async function runLifecycle(runNumber, identities, restaurantId, dishId, foreignRestaurantId) {
  const { customer, secondaryCustomer, restaurant, driver, secondaryDriver, admin } = identities;
  const order = await createOrder(customer, restaurantId, dishId, runNumber);
  const blockedOrder = await createOrder(customer, restaurantId, dishId, `${runNumber}-negative`);

  const restaurantOrders = unwrap((await request(urls.LOCAL_RESTAURANT_URL, `/restaurants/${restaurantId}/orders`, { token: restaurant.token })).payload);
  assert(Array.isArray(restaurantOrders) && restaurantOrders.some((item) => item.id === order.id), "restaurant did not see its own order");

  await runNegativeChecks({ order, blockedOrder, customer, secondaryCustomer, restaurant, driver, secondaryDriver, admin, foreignRestaurantId });

  for (const status of ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"]) {
    await updateRestaurantStatus(order.id, status, restaurant);
  }

  const available = unwrap((await request(urls.LOCAL_DRIVER_URL, "/drivers/orders/available", { token: driver.token })).payload);
  assert(Array.isArray(available) && available.some((item) => item.id === order.id), "driver did not see READY_FOR_PICKUP order");
  expectOneOfStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${order.id}/accept`, { method: "POST", token: driver.token }), [200, 201], "driver claim");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${secondaryDriver.user.id}/orders/${order.id}/accept`, { method: "POST", token: secondaryDriver.token }), 409, "second driver claim");
  await updateDriverStatus(order.id, driver, "PICKED_UP");
  await updateDriverStatus(order.id, driver, "DELIVERED");
  expectStatus(await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${order.id}/status`, { method: "PUT", token: driver.token, body: { status: "DELIVERED" } }), 409, "repeated terminal transition");

  const customerFinal = unwrap((await request(urls.LOCAL_CUSTOMER_URL, `/orders/${order.id}`, { token: customer.token })).payload);
  assert(customerFinal?.id === order.id && customerFinal.status === "DELIVERED", "customer final status mismatch");
  const restaurantFinal = unwrap((await request(urls.LOCAL_RESTAURANT_URL, `/restaurants/${restaurantId}/orders`, { token: restaurant.token })).payload);
  assert(restaurantFinal.some((item) => item.id === order.id && item.status === "DELIVERED"), "restaurant final status mismatch");
  const adminFinal = unwrap((await request(urls.LOCAL_ADMIN_URL, `/admin/orders?restaurantId=${encodeURIComponent(restaurantId)}&limit=100`, { token: admin.token })).payload);
  const adminOrders = adminFinal?.orders ?? adminFinal;
  assert(Array.isArray(adminOrders) && adminOrders.filter((item) => item.id === order.id).length === 1 && adminOrders.find((item) => item.id === order.id).status === "DELIVERED", "admin final status or uniqueness mismatch");
  const active = unwrap((await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/active`, { token: driver.token })).payload);
  assert(Array.isArray(active) && !active.some((item) => item.id === order.id), "delivered order remained active for driver");

  return {
    orderId: order.id,
    customerId: customer.user.id,
    restaurantId,
    driverId: driver.user.id,
    statusSequence: ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "ACCEPTED", "PICKED_UP", "DELIVERED"],
  };
}

async function main() {
  await verifyFrontendOrigins();
  const customer = await login("customer", credentials.customer.email, credentials.customer.password, urls.LOCAL_CUSTOMER_URL);
  const restaurant = await login("restaurant", credentials.restaurant.email, credentials.restaurant.password, urls.LOCAL_RESTAURANT_URL);
  const driver = await login("driver", credentials.driver.email, credentials.driver.password, urls.LOCAL_DRIVER_URL);
  const admin = await login("admin", credentials.admin.email, credentials.admin.password, urls.LOCAL_ADMIN_URL);
  const secondaryCustomer = await registerOrLoginCustomer();
  const secondaryDriver = await registerOrLoginDriver();
  const publicRestaurants = unwrap((await request(urls.LOCAL_CUSTOMER_URL, "/restaurants/public")).payload);
  assert(Array.isArray(publicRestaurants), "public restaurant response is not an array");
  const foreignRestaurant = publicRestaurants.find((item) => item.id !== restaurant.user.id);
  assert(foreignRestaurant?.id, "no foreign restaurant fixture available");
  const dishes = unwrap((await request(urls.LOCAL_CUSTOMER_URL, `/restaurants/${restaurant.user.id}/dishes`)).payload);
  const dish = Array.isArray(dishes) && (dishes.find((item) => item.id === "dish-pizza-pepperoni") || dishes[0]);
  assert(dish?.id, "no orderable restaurant dish available");
  const identities = { customer, secondaryCustomer, restaurant, driver, secondaryDriver, admin };
  const results = [];
  for (let runNumber = 1; runNumber <= runs; runNumber += 1) {
    const result = await runLifecycle(runNumber, identities, restaurant.user.id, dish.id, foreignRestaurant.id);
    results.push(result);
    console.log(`LIFECYCLE_RUN_${runNumber}=PASS ${JSON.stringify(result)}`);
  }
  console.log(`LOCAL_ORDER_LIFECYCLE=PASS runs=${results.length} skipped=0 pending=0`);
}

main().catch((error) => {
  console.error(`LOCAL_ORDER_LIFECYCLE=FAIL ${error.message}`);
  process.exitCode = 1;
});
