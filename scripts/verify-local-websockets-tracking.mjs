#!/usr/bin/env node

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const backendRoot = resolve(repoRoot, "backend");
const frontendRoot = resolve(repoRoot, "frontend/customer-web");
const requireFromBackend = createRequire(resolve(backendRoot, "package.json"));
const requireFromFrontend = createRequire(resolve(frontendRoot, "package.json"));
const { io } = requireFromFrontend("socket.io-client");
const jwt = requireFromBackend("jsonwebtoken");
const { PrismaClient } = requireFromBackend("@prisma/client");

const requiredNames = [
  "LOCAL_BACKEND_URL",
  "LOCAL_CUSTOMER_URL",
  "LOCAL_ADMIN_URL",
  "LOCAL_RESTAURANT_URL",
  "LOCAL_DRIVER_URL",
  "LOCAL_CUSTOMER_EMAIL",
  "LOCAL_CUSTOMER_PASSWORD",
  "LOCAL_RESTAURANT_EMAIL",
  "LOCAL_RESTAURANT_PASSWORD",
  "LOCAL_RESTAURANT_B_EMAIL",
  "LOCAL_RESTAURANT_B_PASSWORD",
  "LOCAL_DRIVER_EMAIL",
  "LOCAL_DRIVER_PASSWORD",
  "LOCAL_ADMIN_EMAIL",
  "LOCAL_ADMIN_PASSWORD",
  "LOCAL_SECOND_CUSTOMER_PASSWORD",
  "LOCAL_SECOND_DRIVER_PASSWORD",
  "LOCAL_JWT_SECRET",
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required; refusing a partial socket run`);
  return value;
}

const urls = Object.fromEntries(
  [
    "LOCAL_BACKEND_URL",
    "LOCAL_CUSTOMER_URL",
    "LOCAL_ADMIN_URL",
    "LOCAL_RESTAURANT_URL",
    "LOCAL_DRIVER_URL",
  ].map((name) => [name, required(name).replace(/\/$/, "")]),
);
const socketUrl = (process.env.LOCAL_SOCKET_URL || urls.LOCAL_BACKEND_URL).replace(/\/$/, "");
const origins = {
  customer: urls.LOCAL_CUSTOMER_URL,
  admin: urls.LOCAL_ADMIN_URL,
  restaurant: urls.LOCAL_RESTAURANT_URL,
  driver: urls.LOCAL_DRIVER_URL,
};
const credentials = {
  customer: { email: required("LOCAL_CUSTOMER_EMAIL"), password: required("LOCAL_CUSTOMER_PASSWORD") },
  restaurant: { email: required("LOCAL_RESTAURANT_EMAIL"), password: required("LOCAL_RESTAURANT_PASSWORD") },
  restaurantB: { email: required("LOCAL_RESTAURANT_B_EMAIL"), password: required("LOCAL_RESTAURANT_B_PASSWORD") },
  driver: { email: required("LOCAL_DRIVER_EMAIL"), password: required("LOCAL_DRIVER_PASSWORD") },
  admin: { email: required("LOCAL_ADMIN_EMAIL"), password: required("LOCAL_ADMIN_PASSWORD") },
};
const runs = Number(process.env.LOCAL_WEBSOCKET_RUNS || "3");
if (!Number.isInteger(runs) || runs < 1) throw new Error("LOCAL_WEBSOCKET_RUNS must be an integer >= 1");

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function unwrap(payload) {
  return payload?.data ?? payload;
}
function tokenFrom(payload) {
  const value = unwrap(payload);
  return value?.access_token ?? value?.accessToken ?? value?.token;
}
function userFrom(payload) {
  const value = unwrap(payload);
  return value?.user ?? value;
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

async function login(role, email, password, origin) {
  const result = await request(origin, "/auth/login", {
    method: "POST",
    body: { email, password, userType: role === "restaurantB" ? "restaurant" : role },
  });
  assert([200, 201].includes(result.status), `${role} real auth login failed with HTTP ${result.status}`);
  const token = tokenFrom(result.payload);
  const user = userFrom(result.payload);
  assert(typeof token === "string" && token.length > 20, `${role} real auth returned no access token`);
  assert(user?.id, `${role} real auth returned no user id`);
  return { token, user };
}

async function registerSecondaryAccounts() {
  const stamp = Date.now();
  const customerEmail = process.env.LOCAL_SECOND_CUSTOMER_EMAIL || `local.ws.secondary.customer.${stamp}@example.test`;
  const driverEmail = process.env.LOCAL_SECOND_DRIVER_EMAIL || `local.ws.secondary.driver.${stamp}@example.test`;
  const customerRegistration = await request(urls.LOCAL_CUSTOMER_URL, "/auth/customer/register", {
    method: "POST",
    body: {
      email: customerEmail,
      password: required("LOCAL_SECOND_CUSTOMER_PASSWORD"),
      name: "Secondary Local WebSocket Customer",
      phone: "+43 123 456 791",
      address: "Local Socket Street 2, 1010 Vienna",
    },
  });
  assert([201, 401].includes(customerRegistration.status), `secondary customer registration failed with HTTP ${customerRegistration.status}`);

  const driverRegistration = await request(urls.LOCAL_DRIVER_URL, "/auth/driver/register", {
    method: "POST",
    body: {
      email: driverEmail,
      password: required("LOCAL_SECOND_DRIVER_PASSWORD"),
      name: "Secondary Local WebSocket Driver",
      phone: "+43 123 456 792",
    },
  });
  assert([200, 201, 409].includes(driverRegistration.status), `secondary driver registration failed with HTTP ${driverRegistration.status}`);

  return {
    customer: await login("customer", customerEmail, required("LOCAL_SECOND_CUSTOMER_PASSWORD"), urls.LOCAL_CUSTOMER_URL),
    driver: await login("driver", driverEmail, required("LOCAL_SECOND_DRIVER_PASSWORD"), urls.LOCAL_DRIVER_URL),
  };
}

async function verifyFrontendOrigins() {
  for (const [name, origin] of Object.entries(origins)) {
    const page = await fetch(`${origin}/`);
    assert(page.status === 200, `${name} frontend did not return HTTP 200`);
    const health = await request(origin, "/health");
    assert(health.status === 200, `${name} frontend proxy health returned HTTP ${health.status}`);
    assert(unwrap(health.payload)?.database?.status === "connected", `${name} frontend proxy is not connected to the isolated database`);
  }
  const health = await request(urls.LOCAL_BACKEND_URL, "/health");
  assert(health.status === 200, `backend health returned HTTP ${health.status}`);
  assert(unwrap(health.payload)?.database?.status === "connected", "backend health is not database-connected");
}

function socketOptions(token, origin, extra = {}) {
  const options = {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    reconnection: false,
    timeout: 5000,
    auth: token === undefined ? {} : { token },
    ...extra,
  };
  options.extraHeaders = {
    ...(origin === undefined ? {} : { Origin: origin }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return options;
}

function connectSocket(name, token, origin, extra = {}) {
  const socket = io(socketUrl, socketOptions(token, origin, extra));
  const client = { name, socket, events: [], connectedAt: 0 };
  socket.onAny((event, payload) => client.events.push({ event, payload, at: Date.now() }));
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      socket.close();
      rejectPromise(new Error(`${name} socket connection timed out`));
    }, 6500);
    socket.once("connect", () => {
      clearTimeout(timer);
      client.connectedAt = Date.now();
      resolvePromise(client);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      socket.close();
      rejectPromise(error);
    });
  });
}

async function expectRejectedSocket(name, token, origin, extra = {}) {
  try {
    await connectSocket(name, token, origin, extra);
  } catch {
    return;
  }
  throw new Error(`${name} socket connection was accepted but must fail closed`);
}

function emitAck(client, event, payload) {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error(`${client.name} ${event} acknowledgement timed out`)), 4000);
    client.socket.timeout(3000).emit(event, payload, (error, response) => {
      clearTimeout(timer);
      if (error) rejectPromise(error);
      else resolvePromise(response);
    });
  });
}

async function waitForDisconnect(client) {
  if (!client.socket.connected) return;
  await new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, 3500);
    client.socket.once("disconnect", () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
}

function closeClient(client) {
  if (client?.socket) client.socket.disconnect();
}

function marker(clients) {
  return new Map(clients.map((client) => [client.name, client.events.length]));
}
function matchingEvents(client, start, event, orderId) {
  return client.events.slice(start).filter((entry) => {
    if (entry.event !== event) return false;
    const payload = entry.payload || {};
    return payload.id === orderId || payload.orderId === orderId;
  });
}
async function assertEventCounts(clients, starts, event, orderId, expectedNames, label) {
  await sleep(450);
  for (const client of clients) {
    const count = matchingEvents(client, starts.get(client.name), event, orderId).length;
    const expected = expectedNames.includes(client.name) ? 1 : 0;
    assert(count === expected, `${label}: ${client.name} received ${count} ${event} event(s), expected ${expected}`);
  }
}
async function assertNoOrderEvent(clients, starts, orderId, label) {
  await sleep(350);
  for (const client of clients) {
    const count = client.events.slice(starts.get(client.name)).filter((entry) => {
      const payload = entry.payload || {};
      return payload.id === orderId || payload.orderId === orderId;
    }).length;
    assert(count === 0, `${label}: ${client.name} received ${count} unauthorized order event(s)`);
  }
}

async function createOrder(customer, restaurant) {
  const dishId = process.env.LOCAL_DISH_ID || "dish-pizza-pepperoni";
  const result = await request(urls.LOCAL_CUSTOMER_URL, "/orders", {
    method: "POST",
    token: customer.token,
    body: {
      customerId: customer.user.id,
      restaurantId: restaurant.user.id,
      items: [{ dishId, quantity: 2 }],
      deliveryAddress: "Local WebSocket Tracking Street, 1010 Vienna",
    },
  });
  assert([200, 201].includes(result.status), `socket order creation failed with HTTP ${result.status}`);
  const order = unwrap(result.payload);
  assert(order?.id && order.customerId === customer.user.id && order.restaurantId === restaurant.user.id, "socket order ownership mismatch");
  assert(order.status === "PENDING", `socket order started in ${order.status} instead of PENDING`);
  return order;
}

async function updateRestaurant(orderId, status, restaurant) {
  const result = await request(urls.LOCAL_RESTAURANT_URL, `/orders/${orderId}/status`, {
    method: "PATCH",
    token: restaurant.token,
    body: { status },
  });
  assert(result.status === 200, `restaurant ${status} HTTP status was ${result.status}`);
  return unwrap(result.payload);
}

async function claimOrder(orderId, driver) {
  const result = await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${orderId}/accept`, {
    method: "POST",
    token: driver.token,
  });
  assert([200, 201].includes(result.status), `driver claim HTTP status was ${result.status}`);
  return unwrap(result.payload);
}

async function updateDriver(orderId, status, driver) {
  const result = await request(urls.LOCAL_DRIVER_URL, `/drivers/${driver.user.id}/orders/${orderId}/status`, {
    method: "PUT",
    token: driver.token,
    body: { status },
  });
  assert(result.status === 200, `driver ${status} HTTP status was ${result.status}`);
  return unwrap(result.payload);
}

async function runAuthMatrix(accounts) {
  const valid = [
    ["customer-valid", accounts.customer, origins.customer],
    ["restaurant-valid", accounts.restaurant, origins.restaurant],
    ["driver-valid", accounts.driver, origins.driver],
    ["admin-valid", accounts.admin, origins.admin],
  ];
  const connected = [];
  try {
    for (const [name, account, origin] of valid) {
      connected.push(await connectSocket(name, account.token, origin));
    }
    const manipulated = await connectSocket(
      "customer-client-role-manipulation",
      accounts.customer.token,
      origins.customer,
      { auth: { token: accounts.customer.token, role: "driver", userType: "driver" } },
    );
    const roleAck = await emitAck(manipulated, "location_update", { orderId: "not-an-order", lat: 48, lng: 16, timestamp: new Date().toISOString() });
    assert(roleAck?.success === false, "client role payload changed the server-side role");
    connected.push(manipulated);
  } finally {
    connected.forEach(closeClient);
  }

  await expectRejectedSocket("missing-token", undefined, origins.customer);
  await expectRejectedSocket("empty-token", "", origins.customer);
  await expectRejectedSocket("malformed-token", "not-a-jwt", origins.customer);
  const expiredToken = jwt.sign({ sub: accounts.customer.user.id, role: "customer" }, required("LOCAL_JWT_SECRET"), { expiresIn: -1 });
  await expectRejectedSocket("expired-token", expiredToken, origins.customer);
  const unknownToken = jwt.sign({ sub: `unknown-${Date.now()}`, role: "customer" }, required("LOCAL_JWT_SECRET"), { expiresIn: "5m" });
  await expectRejectedSocket("unknown-user-token", unknownToken, origins.customer);
  await expectRejectedSocket("foreign-origin", accounts.customer.token, "https://evil.example.test");

  const prisma = new PrismaClient();
  try {
    await prisma.customer.update({ where: { id: accounts.customerB.user.id }, data: { isActive: false } });
    await expectRejectedSocket("deactivated-user", accounts.customerB.token, origins.customer);
  } finally {
    await prisma.customer.update({ where: { id: accounts.customerB.user.id }, data: { isActive: true } });
    await prisma.$disconnect();
  }
}

async function runLiveOrderAndTracking(accounts, runNumber) {
  const clients = [];
  const socketClients = [
    ["customerA", accounts.customer, origins.customer],
    ["customerB", accounts.customerB, origins.customer],
    ["restaurantA", accounts.restaurant, origins.restaurant],
    ["restaurantB", accounts.restaurantB, origins.restaurant],
    ["driverA", accounts.driver, origins.driver],
    ["driverB", accounts.driverB, origins.driver],
    ["admin", accounts.admin, origins.admin],
  ];
  for (const [name, account, origin] of socketClients) clients.push(await connectSocket(name, account.token, origin));
  const byName = Object.fromEntries(clients.map((client) => [client.name, client]));

  try {
    const createStart = marker(clients);
    const order = await createOrder(accounts.customer, accounts.restaurant);
    await sleep(450);
    assert(matchingEvents(byName.restaurantA, createStart.get("restaurantA"), "order-created", order.id).length === 1, "restaurant A missed order-created");
    assert(matchingEvents(byName.restaurantA, createStart.get("restaurantA"), "new-order", order.id).length === 1, "restaurant A missed new-order");
    assert(matchingEvents(byName.admin, createStart.get("admin"), "order-created", order.id).length === 1, "admin missed order-created");
    await assertNoOrderEvent([byName.customerB, byName.restaurantB, byName.driverB], new Map(["customerB", "restaurantB", "driverB"].map((name) => [name, createStart.get(name)])), order.id, "order-created isolation");

    for (const participant of [byName.customerA, byName.restaurantA, byName.admin]) {
      const ack = await emitAck(participant, "join-order", { orderId: order.id });
      assert(ack?.success === true && ack.room === `order_${order.id}`, `${participant.name} could not join its authorized order room`);
    }
    for (const outsider of [byName.customerB, byName.restaurantB, byName.driverA, byName.driverB]) {
      const ack = await emitAck(outsider, "join-order", { orderId: order.id });
      assert(ack?.success === false, `${outsider.name} joined an unauthorized order room`);
    }
    for (const invalid of ["", "does-not-exist", "x".repeat(129), { room: "order_" + order.id }, [], { orderId: [order.id] }]) {
      const ack = await emitAck(byName.customerB, "join-order", invalid);
      assert(ack?.success === false, "malformed order-room payload was accepted");
    }
    const leaveAck = await emitAck(byName.customerA, "leave-order", { orderId: order.id });
    assert(leaveAck?.success === true, "authorized order-room leave was not acknowledged");
    const rejoinAck = await emitAck(byName.customerA, "join-order", { orderId: order.id });
    assert(rejoinAck?.success === true, "authorized order-room rejoin was not acknowledged");

    for (const status of ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"]) {
      const starts = marker(clients);
      await updateRestaurant(order.id, status, accounts.restaurant);
      await assertEventCounts(clients, starts, "order-updated", order.id, ["customerA", "restaurantA", "admin"], `status ${status}`);
    }

    const claimStarts = marker(clients);
    await claimOrder(order.id, accounts.driver);
    await sleep(450);
    assert(matchingEvents(byName.driverA, claimStarts.get("driverA"), "order-assigned", order.id).length === 1, "assigned driver missed order-assigned");
    assert(matchingEvents(byName.restaurantA, claimStarts.get("restaurantA"), "order-updated", order.id).length === 1, "restaurant A missed assignment update");
    const driverOrderJoin = await emitAck(byName.driverA, "join-order", { orderId: order.id });
    assert(driverOrderJoin?.success === true, "assigned driver could not join its order room");

    const trackingPayload = { orderId: order.id, lat: 48.2082, lng: 16.3738, heading: 90, speed: 8, accuracy: 4, timestamp: new Date().toISOString() };
    const trackingStarts = marker(clients);
    const trackingAck = await emitAck(byName.driverA, "location_update", trackingPayload);
    assert(trackingAck?.success === true && trackingAck.driverId === accounts.driver.user.id, "assigned driver tracking was not accepted");
    await sleep(450);
    for (const recipient of [byName.customerA, byName.restaurantA, byName.admin]) {
      const receivedTracking = matchingEvents(recipient, trackingStarts.get(recipient.name), "driver-location-update", order.id);
      assert(receivedTracking.length === 1, `${recipient.name} missed driver-location-update (events after marker: ${recipient.events.slice(trackingStarts.get(recipient.name)).map((entry) => entry.event).join(",")})`);
    }
    await assertNoOrderEvent([byName.customerB, byName.restaurantB, byName.driverB], new Map(["customerB", "restaurantB", "driverB"].map((name) => [name, trackingStarts.get(name)])), order.id, "tracking isolation");
    assert((await emitAck(byName.driverB, "location_update", trackingPayload))?.success === false, "foreign driver published tracking");
    assert((await emitAck(byName.customerA, "location_update", trackingPayload))?.success === false, "customer published tracking");
    assert((await emitAck(byName.restaurantA, "location_update", trackingPayload))?.success === false, "restaurant published tracking");
    assert((await emitAck(byName.driverA, "location_update", { ...trackingPayload, lat: 91 }))?.success === false, "invalid latitude was accepted");
    assert((await emitAck(byName.driverA, "location_update", { ...trackingPayload, lng: Infinity }))?.success === false, "invalid longitude was accepted");
    assert((await emitAck(byName.driverA, "location_update", { ...trackingPayload, driverId: accounts.driverB.user.id }))?.success === false, "manipulated driver identity was accepted");
    assert((await emitAck(byName.driverA, "location_update", { ...trackingPayload, timestamp: new Date(Date.now() - 3600000).toISOString() }))?.success === false, "stale tracking timestamp was accepted");

    byName.customerA.socket.disconnect();
    await waitForDisconnect(byName.customerA);
    const reconnectedCustomer = await connectSocket("customerA-reconnected", accounts.customer.token, origins.customer);
    const reconnectNoRoomStarts = reconnectedCustomer.events.length;
    const reconnectTrackingAck = await emitAck(byName.driverA, "location_update", { ...trackingPayload, lat: 48.209 });
    assert(reconnectTrackingAck?.success === true, "tracking sender failed after customer reconnect");
    await sleep(350);
    assert(matchingEvents(reconnectedCustomer, reconnectNoRoomStarts, "driver-location-update", order.id).length === 0, "reconnect restored a previous order room without revalidation");
    assert((await emitAck(reconnectedCustomer, "join-order", { orderId: order.id }))?.success === true, "reconnected customer could not rejoin after server ownership check");
    const reconnectRoomStarts = reconnectedCustomer.events.length;
    await emitAck(byName.driverA, "location_update", { ...trackingPayload, lat: 48.210 });
    await sleep(350);
    assert(matchingEvents(reconnectedCustomer, reconnectRoomStarts, "driver-location-update", order.id).length === 1, "reconnected customer missed tracking after authorized rejoin");
    const oldCustomerIndex = clients.indexOf(byName.customerA);
    if (oldCustomerIndex >= 0) clients.splice(oldCustomerIndex, 1);
    clients.push(reconnectedCustomer);
    byName.customerA = reconnectedCustomer;

    const logoutResult = await request(urls.LOCAL_CUSTOMER_URL, "/auth/logout-all", { method: "POST", token: accounts.customer.token });
    assert([200, 201].includes(logoutResult.status), `customer logout-all returned HTTP ${logoutResult.status}`);
    const logoutDisconnect = waitForDisconnect(byName.customerA);
    byName.customerA.socket.emit("join-order", { orderId: order.id });
    await logoutDisconnect;
    const loggedOutCustomerIndex = clients.indexOf(byName.customerA);
    if (loggedOutCustomerIndex >= 0) clients.splice(loggedOutCustomerIndex, 1);
    await expectRejectedSocket("logged-out-customer-token", accounts.customer.token, origins.customer);
    const freshCustomer = await login("customer", credentials.customer.email, credentials.customer.password, urls.LOCAL_CUSTOMER_URL);
    const freshCustomerSocket = await connectSocket("customerA", freshCustomer.token, origins.customer);
    assert((await emitAck(freshCustomerSocket, "join-order", { orderId: order.id }))?.success === true, "new login did not receive a fresh authorized socket identity");
    clients.push(freshCustomerSocket);
    byName.customerA = freshCustomerSocket;

    const pickedStarts = marker(clients);
    await updateDriver(order.id, "PICKED_UP", accounts.driver);
    await assertEventCounts(clients, pickedStarts, "order-updated", order.id, ["customerA", "restaurantA", "admin"], "status PICKED_UP");
    const driverUpdateCount = matchingEvents(byName.driverA, pickedStarts.get("driverA"), "order-update", order.id).length;
    assert(driverUpdateCount === 1, `driver A received ${driverUpdateCount} order-update events for PICKED_UP`);

    const deliveredStarts = marker(clients);
    await updateDriver(order.id, "DELIVERED", accounts.driver);
    await assertEventCounts(clients, deliveredStarts, "order-updated", order.id, ["customerA", "restaurantA", "admin"], "status DELIVERED");
    assert((await emitAck(byName.driverA, "location_update", trackingPayload))?.success === false, "tracking after DELIVERED was accepted");
    assert((await emitAck(byName.driverA, "join-order", { orderId: order.id }))?.success === true, "assigned participant could not observe terminal order state");
    return { orderId: order.id, eventCounts: clients.map((client) => ({ client: client.name, events: client.events.length })) };
  } finally {
    clients.forEach(closeClient);
  }
}

async function main() {
  await verifyFrontendOrigins();
  const primary = {
    customer: await login("customer", credentials.customer.email, credentials.customer.password, urls.LOCAL_CUSTOMER_URL),
    restaurant: await login("restaurant", credentials.restaurant.email, credentials.restaurant.password, urls.LOCAL_RESTAURANT_URL),
    restaurantB: await login("restaurantB", credentials.restaurantB.email, credentials.restaurantB.password, urls.LOCAL_RESTAURANT_URL),
    driver: await login("driver", credentials.driver.email, credentials.driver.password, urls.LOCAL_DRIVER_URL),
    admin: await login("admin", credentials.admin.email, credentials.admin.password, urls.LOCAL_ADMIN_URL),
  };
  const secondary = await registerSecondaryAccounts();
  const accounts = { ...primary, customerB: secondary.customer, driverB: secondary.driver };
  const results = [];
  for (let run = 1; run <= runs; run += 1) {
    if (run > 1) {
      accounts.customer = await login("customer", credentials.customer.email, credentials.customer.password, urls.LOCAL_CUSTOMER_URL);
    }
    await runAuthMatrix(accounts);
    const result = await runLiveOrderAndTracking(accounts, run);
    results.push(result);
    console.log(JSON.stringify({ run, orderId: result.orderId, status: "PASS", eventCounts: result.eventCounts }));
  }
  assert(results.length === runs, "not all requested socket runs completed");
  console.log(JSON.stringify({ status: "PASS", runs, skipped: 0, pending: 0, socketUrl, path: "/socket.io/", namespace: "/" }));
}

main().catch((error) => {
  console.error(`LOCAL-11 WebSocket/Tracking verifier FAILED: ${error.message}`);
  process.exitCode = 1;
});
