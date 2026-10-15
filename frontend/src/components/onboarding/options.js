// Fixed lists of choices used on the onboarding screens (copied from the design file).

// 04 Review: language levels (1 = Basic ... 5 = Native) and the languages you can add.
export const LEVELS = ['Basic', 'Conversational', 'Professional', 'Fluent', 'Native']
export const LANGUAGES = ['English', 'French', 'Spanish', 'German', 'Arabic', 'Mandarin', 'Cantonese', 'Hindi', 'Urdu', 'Bengali', 'Punjabi', 'Tamil', 'Gujarati', 'Portuguese', 'Italian', 'Japanese', 'Korean', 'Russian', 'Ukrainian', 'Polish', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Turkish', 'Hebrew', 'Persian', 'Swahili', 'Yoruba', 'Igbo', 'Amharic', 'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Tagalog', 'Czech', 'Hungarian', 'Romanian', 'Welsh', 'Irish', 'British Sign Language']

// 05 Personality: the 8 statements. w = which way agreeing pushes you:
// +1 towards extrovert, -1 towards introvert, 0 neither.
export const STATEMENTS = [
  { t: "I'm funny", w: 1 },
  { t: "I'm more logical than emotional", w: 0 },
  { t: 'I plan more than I improvise', w: -1 },
  { t: 'I recharge by being around people', w: 1 },
  { t: "I'd rather message than call", w: -1 },
  { t: 'I think out loud', w: 1 },
  { t: 'Big events drain me, even fun ones', w: -1 },
  { t: "I'm happy taking the lead in group work", w: 1 },
]
// The statements are shown 3, 3 and 2 at a time.
export const STATEMENT_PAGES = [[0, 1, 2], [3, 4, 5], [6, 7]]
export const VERT_LABELS = ['Introvert', 'Ambivert', 'Extrovert']

// 06 Interests: the three optional questions.
export const RELATIONSHIP = ['Prefer not to say', 'Single', 'In a relationship', 'It’s complicated']
export const DRINK = ['Prefer not to say', 'Yes', 'Sometimes', 'No']
export const COUNTRIES = ["United Kingdom", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Brazzaville)", "Congo (DRC)", "Costa Rica", "Côte d’Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"]

