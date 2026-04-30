import type { TaskDefinition, MenuSection } from '../types'

export const TASK_DEFINITIONS: TaskDefinition[] = [
  { id: 'madalia_reviews', label: 'Madalia Online Booking Reviews', icon: '⭐' },
  { id: 'cvent_rfp',       label: 'Cvent RFP',                      icon: '📨' },
  { id: 'business_cases',  label: 'Business Cases',                  icon: '💼' },
  { id: 'leisure',         label: 'Leisure',                         icon: '🌴' },
  { id: 'transient',       label: 'Transient',                       icon: '🚗' },
  { id: 'reply_reviews',   label: 'Reply All Reviews',               icon: '💬' },
]

export const MENU_SECTIONS: MenuSection[] = [
  {
    key: 'entree',
    label: 'Choice of Entrée',
    rule: 'Pick One',
    type: 'radio',
    items: [
      { id: 'chicken_fingers',         label: 'Chicken Fingers' },
      { id: 'crispy_chicken_sandwich', label: 'Crispy Chicken Sandwich' },
      { id: 'crispy_chicken_salad',    label: 'Crispy Chicken Salad' },
      { id: 'cheeseburger',            label: 'Cheeseburger' },
      { id: 'veggie_burger',           label: 'Veggie Burger', tag: 'V' },
    ],
  },
  {
    key: 'sides',
    label: 'Choice of Side',
    rule: 'Choose Two',
    type: 'checkbox',
    max: 2,
    items: [
      { id: 'tater_tots',      label: 'Tater Tots / Fries' },
      { id: 'steamed_veggies', label: 'Steamed Veggies' },
      { id: 'side_salad',      label: 'Side Salad' },
      { id: 'potato_chips',    label: 'Potato Chips' },
      { id: 'mac_cheese',      label: 'Mac & Cheese' },
    ],
  },
  {
    key: 'dessert',
    label: 'Choice of Dessert',
    rule: 'Pick One',
    type: 'radio',
    items: [
      { id: 'cookie_pastry', label: 'Cookie / Pastry' },
      { id: 'fresh_fruits',  label: 'Fresh Fruits' },
      { id: 'yogurt',        label: 'Yogurt' },
    ],
  },
  {
    key: 'drink',
    label: 'Choice of Drink',
    rule: 'Pick One',
    type: 'radio',
    items: [
      { id: 'water', label: 'Water' },
      { id: 'soda',  label: 'Soda' },
      { id: 'juice', label: 'Juice' },
    ],
  },
]
