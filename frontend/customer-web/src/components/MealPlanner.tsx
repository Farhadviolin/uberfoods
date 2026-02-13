import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRestaurants } from '../hooks/useRestaurants';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { Calendar, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { PlannedMeal, Restaurant, Dish, AxiosErrorWithResponse } from '../types';
import api from '../utils/api';
import {
  useMealPlans,
  useCreateMealPlan,
  useDeleteMealPlan,
  useExecuteMealPlan,
} from '../hooks/useMealPlanner';
import './MealPlanner.css';

export function MealPlanner() {
  const { t } = useTranslation();
  const { data: restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { showToast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // API Hooks
  const { data: mealPlans = [], isLoading: mealsLoading } = useMealPlans();
  
  // Transform MealPlan[] to PlannedMeal[] for ShoppingListCard
  const plannedMeals: PlannedMeal[] = mealPlans.map(plan => ({
    id: plan.id,
    date: plan.date,
    restaurantId: plan.restaurantId,
    restaurantName: plan.restaurant?.name || '',
    dishIds: plan.dishIds,
    notes: plan.notes,
  }));
  const createMealMutation = useCreateMealPlan();
  const deleteMealMutation = useDeleteMealPlan();
  const executeMealMutation = useExecuteMealPlan();

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getMealsForDate = (date: Date) => {
    return plannedMeals.filter((meal) => isSameDay(new Date(meal.date), date));
  };

  const addMeal = async (date: Date, restaurantId: string, dishIds: string[], notes?: string) => {
    try {
      await createMealMutation.mutateAsync({
        date: date.toISOString(),
        restaurantId,
        dishIds,
        notes,
      });
      setShowAddModal(false);
      setSelectedDate(null);
      showToast(t('common.success'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('errors.generic'), 'error');
    }
  };

  const removeMeal = async (mealId: string) => {
    try {
      await deleteMealMutation.mutateAsync(mealId);
      showToast(t('mealPlanner.mealDeleted'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('mealPlanner.deleteError'), 'error');
    }
  };

  const executeMeal = async (mealId: string) => {
    try {
      await executeMealMutation.mutateAsync(mealId);
      showToast(t('mealPlanner.orderExecuted'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('mealPlanner.executeError'), 'error');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeek(addDays(selectedWeek, direction === 'next' ? 7 : -7));
  };

  const isLoading = restaurantsLoading || mealsLoading;

  if (isLoading) {
    return (
      <div className="meal-planner">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" width="100%" height="400px" />
      </div>
    );
  }

  return (
    <div className="meal-planner">
      <div className="meal-planner-header">
        <div className="header-title">
          <Calendar size={24} />
          <h1>Meal Planner</h1>
        </div>
        <p className="header-subtitle">Planen Sie Ihre Mahlzeiten für die Woche</p>
      </div>

      <Card variant="elevated" className="week-navigation">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigateWeek('prev')}
        >
          ← Vorherige Woche
        </Button>
        <div className="week-display">
          {format(weekStart, 'd. MMM', { locale: de })} -{' '}
          {format(addDays(weekStart, 6), 'd. MMM yyyy', { locale: de })}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigateWeek('next')}
        >
          Nächste Woche →
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setSelectedWeek(new Date());
          }}
        >
          Diese Woche
        </Button>
      </Card>

      <div className="week-grid">
        {weekDays.map((day) => {
          const meals = getMealsForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              variant={isToday ? 'elevated' : 'outlined'}
              className={`day-card ${isToday ? 'day-card--today' : ''}`}
            >
              <div className="day-header">
                <div className="day-name">{format(day, 'EEEE', { locale: de })}</div>
                <div className="day-date">{format(day, 'd. MMM', { locale: de })}</div>
              </div>

              <div className="meals-list">
                {meals.length > 0 ? (
                  meals.map((meal) => (
                    <div key={meal.id} className="meal-item">
                      <div className="meal-info">
                        <div className="meal-restaurant">{meal.restaurant?.name || 'Unbekanntes Restaurant'}</div>
                        {meal.notes && (
                          <div className="meal-notes">{meal.notes}</div>
                        )}
                        <div className="meal-dishes">
                          {meal.dishIds.length} {meal.dishIds.length === 1 ? 'Gericht' : 'Gerichte'}
                        </div>
                      </div>
                  <div className="meal-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ShoppingCart size={14} />}
                      iconPosition="left"
                      onClick={() => executeMeal(meal.id)}
                    >
                      Jetzt bestellen
                    </Button>
                    <button
                      onClick={() => removeMeal(meal.id)}
                      className="remove-meal-btn"
                      aria-label={t('mealPlanner.removeMeal')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                    </div>
                  ))
                ) : (
                  <div className="no-meals">
                    <p>Keine Mahlzeit geplant</p>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                icon={<Plus size={16} />}
                iconPosition="left"
                onClick={() => {
                  setSelectedDate(day);
                  setShowAddModal(true);
                }}
                className="add-meal-btn"
              >
                Mahlzeit hinzufügen
              </Button>
            </Card>
          );
        })}
      </div>

      {showAddModal && selectedDate && (
        <AddMealModal
          date={selectedDate}
          restaurants={restaurants || []}
          onAdd={addMeal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedDate(null);
          }}
        />
      )}

      {plannedMeals.length > 0 && (
        <ShoppingListCard meals={plannedMeals} restaurants={restaurants || []} />
      )}
    </div>
  );
}

interface AddMealModalProps {
  date: Date;
  restaurants: Restaurant[];
  onAdd: (date: Date, restaurantId: string, dishIds: string[], notes?: string) => void;
  onClose: () => void;
}

interface ShoppingListCardProps {
  meals: PlannedMeal[];
  restaurants: Restaurant[];
}

function ShoppingListCard({ meals, restaurants }: ShoppingListCardProps) {
  const { showToast } = useToast();
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState<Array<{ dish: string; restaurant: string; date: string }>>([]);

  const generateShoppingList = async () => {
    try {
      const list: Array<{ dish: string; restaurant: string; date: string }> = [];
      
      for (const meal of meals) {
        const restaurant = restaurants.find(r => r.id === meal.restaurantId);
        if (!restaurant) continue;
        
        // Lade vollständige Restaurant-Daten mit Gerichten
        try {
          const response = await api.get(`/restaurants/public/${meal.restaurantId}`);
          const restaurantData = response.data;
          const dishes = restaurantData.dishes || [];
          
          for (const dishId of meal.dishIds) {
            const dish = dishes.find((d: Dish) => d.id === dishId);
            if (dish) {
              list.push({
                dish: dish.name,
                restaurant: restaurant.name,
                date: new Date(meal.date).toLocaleDateString('de-DE', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })
              });
            }
          }
        } catch (err) {
          // Fallback: Verwende nur verfügbare Daten
          if (restaurant.dishes) {
            for (const dishId of meal.dishIds) {
              const dish = restaurant.dishes.find(d => d.id === dishId);
              if (dish) {
                list.push({
                  dish: dish.name,
                  restaurant: restaurant.name,
                  date: new Date(meal.date).toLocaleDateString('de-DE', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                  })
                });
              }
            }
          }
        }
      }
      
      setShoppingList(list);
      setShowShoppingList(true);
    } catch (error) {
      showToast('Fehler beim Generieren der Einkaufsliste', 'error');
    }
  };

  const exportShoppingList = () => {
    if (shoppingList.length === 0) return;
    
    const text = shoppingList
      .map(item => `- ${item.dish} (${item.restaurant}) - ${item.date}`)
      .join('\n');
    
    const blob = new Blob([`Einkaufsliste\n\n${text}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'einkaufsliste.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card variant="elevated" className="shopping-list-card">
      <div className="shopping-list-header">
        <ShoppingCart size={20} />
        <h3>Einkaufsliste</h3>
      </div>
      <div className="shopping-list-content">
        {!showShoppingList ? (
          <>
            <p>Generieren Sie eine Einkaufsliste basierend auf Ihren geplanten Mahlzeiten.</p>
            <Button variant="outline" size="sm" onClick={generateShoppingList}>
              Einkaufsliste generieren
            </Button>
          </>
        ) : (
          <>
            <div className="shopping-list-items">
              {shoppingList.map((item, index) => (
                <div key={index} className="shopping-list-item">
                  <div className="shopping-item-dish">{item.dish}</div>
                  <div className="shopping-item-meta">
                    <span>{item.restaurant}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="shopping-list-actions">
              <Button variant="outline" size="sm" onClick={exportShoppingList}>
                Als Text exportieren
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowShoppingList(false)}>
                Schließen
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function AddMealModal({ date, restaurants, onAdd, onClose }: AddMealModalProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const restaurant = restaurants.find((r) => r.id === selectedRestaurant);
  const availableDishes = restaurant?.dishes || [];

  const handleAdd = () => {
    if (selectedRestaurant && selectedDishes.length > 0) {
      onAdd(date, selectedRestaurant, selectedDishes, notes);
    }
  };

  const toggleDish = (dishId: string) => {
    setSelectedDishes((prev) =>
      prev.includes(dishId)
        ? prev.filter((id) => id !== dishId)
        : [...prev, dishId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="elevated" className="add-meal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mahlzeit planen für {format(date, 'EEEE, d. MMM yyyy', { locale: de })}</h2>
          <button onClick={onClose} className="close-modal-btn" aria-label="Schließen">
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Restaurant auswählen</label>
            <select
              value={selectedRestaurant}
              onChange={(e) => {
                setSelectedRestaurant(e.target.value);
                setSelectedDishes([]);
              }}
              className="form-select"
            >
              <option value="">Restaurant wählen...</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {restaurant && (
            <div className="form-group">
              <label>Gerichte auswählen</label>
              <div className="dishes-list">
                {availableDishes.map((dish: Dish) => (
                  <label key={dish.id} className="dish-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedDishes.includes(dish.id)}
                      onChange={() => toggleDish(dish.id)}
                    />
                    <span className="dish-name">{dish.name}</span>
                    <span className="dish-price">€{dish.price.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Notizen (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
              className="form-textarea"
              rows={3}
            />
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={!selectedRestaurant || selectedDishes.length === 0}
          >
            Hinzufügen
          </Button>
        </div>
      </Card>
    </div>
  );
}

