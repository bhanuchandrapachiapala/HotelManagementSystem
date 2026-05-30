import type { TaskDefinition, MenuSection } from '../types'

export const TASK_DEFINITIONS: TaskDefinition[] = [
  { id: 'madalia_reviews', label: 'Madalia Online Booking Reviews', icon: '⭐' },
  { id: 'cvent_rfp',       label: 'Cvent RFP',                      icon: '📨' },
  { id: 'business_cases',  label: 'Business Cases',                  icon: '💼' },
  { id: 'leisure',         label: 'Leisure',                         icon: '🌴' },
  { id: 'transient',       label: 'Transient',                       icon: '🚗' },
  { id: 'reply_reviews',   label: 'Reply All Reviews',               icon: '💬' },
]

export const FRONT_DESK_TASKS: TaskDefinition[] = [
  { id: 'fd_greet_guests', label: 'Greet guests properly — stand up, professional conversation', icon: '🤝' },
  { id: 'fd_cash_drawer', label: 'Take over cash drawer — recount, verify previous shift signed off, cash dropped', icon: '💵' },
  { id: 'fd_task_sheets', label: 'Check all task sheets — Cash & Key logs, Guest Call-In log, Maintenance log, Shuttle log, Market Inventory log', icon: '📋' },
  { id: 'fd_print_hk_boards', label: 'Print HK boards and maintain supply list', icon: '🖨️' },
  { id: 'fd_night_stay_audit', label: 'Make zero night stay, post charges and payments including after audit check-ins and No-Show folios', icon: '🌙' },
  { id: 'fd_cc_auth_report', label: 'Check CC authorization report for declines — post all marketplace payments to house accounts or guest folios', icon: '💳' },
  { id: 'fd_inhouse_list', label: 'Print in-house list — check every room folio for sufficient CC authorization', icon: '📄' },
  { id: 'fd_dueout_cards', label: 'Pull all due-out reg cards from bucket — file previous day FD reports with audit bag', icon: '📁' },
  { id: 'fd_hk_coordination', label: 'Do not check out due-out rooms until verified with HK by 11:30 AM — coordinate inspections around 3 PM', icon: '🏨' },
  { id: 'fd_breakfast_setup', label: 'Check breakfast setup, refills and clean up — cover breakfast attendant', icon: '🍳' },
  { id: 'fd_open_fitness_laundry', label: 'Open fitness room at 7 AM and laundry room at 9 AM — close both at 9 PM', icon: '🏋️' },
  { id: 'fd_coffee_machine', label: 'Clean coffee machine and log cleaning time', icon: '☕' },
  { id: 'fd_reg_cards', label: 'Verify every reg card has vehicle info, phone number, copy of guest ID, and CC name match', icon: '🪪' },
  { id: 'fd_arrivals_check', label: 'Check arrival list for comments and requests — collect deposits from prepaids, authorize arrival CCs', icon: '📥' },
  { id: 'fd_pet_form', label: 'Ask guests about pets — fill pet form, post pet charges, authorize CC for extra', icon: '🐾' },
  { id: 'fd_lost_found', label: 'Document and secure Lost and Found items — log every guest comment, issue, and phone message', icon: '🔍' },
  { id: 'fd_cameras', label: 'Watch cameras constantly — report suspicious activity especially local resident extended stays', icon: '📷' },
  { id: 'fd_dnr_check', label: 'Check all arrivals for DNR — limit personal cell phone use to emergencies only', icon: '🚫' },
  { id: 'fd_fill_fridge', label: 'Fill desk fridge', icon: '🧊' },
  { id: 'fd_drawer_count', label: 'Count drawer to $100 cash — close cashier shift, drop deposit in safe, have co-worker verify drop', icon: '🏦' },
  { id: 'fd_marketplace_log', label: 'Enter all marketplace sales in House Account — maintain marketplace inventory log', icon: '🛒' },
  { id: 'fd_slow_time', label: 'During slow periods — fold laundry, organize desk, wipe surfaces, clean lobby and eating area, sanitize keys', icon: '🧹' },
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
