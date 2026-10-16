// Data for the career route screens (07a Career path, 07b Work values, 08 Areas, 09 Gaps)
// and the "Target career" card on Profile.
//
// All of it is sample data copied from the design file (UI Design/LARP App Screens.dc.html).
// Salaries are UK graduate medians in £ thousands. Alumni counts are made up but realistic.
// Later, the back end (docs/BACKEND_REPLAN.md) will send the real numbers instead.

// ── 07a · Roles ──────────────────────────────────────────────
// One role per entry: name | sector | UCL alumni in that role | median starting salary (£k)
const ROLE_TEXT =
  'Product Manager|Tech|1240|48;Product Analyst|Tech|310|38;Software Engineer|Tech|2100|45;' +
  'Data Analyst|Tech|980|36;Data Scientist|Tech|640|45;Data Engineer|Tech|420|46;' +
  'Machine Learning Engineer|Tech|280|52;Head of Data|Tech|60|85;Frontend Developer|Tech|540|40;' +
  'Backend Developer|Tech|610|44;Full-stack Developer|Tech|700|43;DevOps Engineer|Tech|230|48;' +
  'Cloud Engineer|Tech|260|47;Site Reliability Engineer|Tech|120|50;Security Engineer|Tech|180|50;' +
  'Cybersecurity Analyst|Tech|210|38;QA Engineer|Tech|190|34;Mobile Developer|Tech|240|42;' +
  'Solutions Architect|Tech|150|60;Technical Program Manager|Tech|110|55;Product Owner|Tech|330|45;' +
  'Growth Manager|Tech|140|42;Business Intelligence Analyst|Tech|360|36;Analytics Engineer|Tech|130|44;' +
  'Research Scientist|Tech|170|50;AI Product Manager|Tech|90|55;Technical Writer|Tech|70|34;' +
  'Scrum Master|Tech|160|42;IT Consultant|Tech|480|38;Database Administrator|Tech|90|40;' +
  'Management Consultant|Consulting|1560|48;Strategy Consultant|Consulting|720|50;' +
  'Technology Consultant|Consulting|890|42;Business Analyst|Consulting|1120|36;' +
  'Associate Consultant|Consulting|640|40;Operations Consultant|Consulting|210|42;' +
  'HR Consultant|Consulting|180|36;Risk Consultant|Consulting|260|40;' +
  'Sustainability Consultant|Consulting|150|36;Digital Transformation Consultant|Consulting|300|44;' +
  'Economic Consultant|Consulting|190|40;Change Manager|Consulting|120|45;' +
  'Data Consultant|Consulting|240|42;Pricing Consultant|Consulting|60|42;' +
  'Healthcare Consultant|Consulting|110|40;Investment Banking Analyst|Finance|1340|60;' +
  'Equity Research Analyst|Finance|280|55;Private Equity Analyst|Finance|190|65;' +
  'Hedge Fund Analyst|Finance|140|70;Asset Management Analyst|Finance|420|45;' +
  'Quantitative Analyst|Finance|260|65;Trader|Finance|310|60;Risk Analyst|Finance|520|38;' +
  'Credit Analyst|Finance|340|36;Financial Analyst|Finance|980|38;' +
  'Corporate Finance Analyst|Finance|450|40;Accountant|Finance|1100|32;Audit Associate|Finance|1400|32;' +
  'Tax Associate|Finance|520|34;Actuarial Analyst|Finance|280|36;Compliance Analyst|Finance|390|36;' +
  'Wealth Manager|Finance|210|40;Venture Capital Analyst|Finance|120|50;' +
  'Fintech Product Manager|Finance|160|52;Treasury Analyst|Finance|140|38;' +
  'Insurance Underwriter|Finance|230|34;Economist|Finance|260|40;Product Designer|Design|190|40;' +
  'UX Designer|Design|380|38;UX Researcher|Design|140|40;UI Designer|Design|210|35;' +
  'Service Designer|Design|90|40;Graphic Designer|Design|260|28;Design Lead|Design|60|65;' +
  'Motion Designer|Design|70|32;Brand Designer|Design|110|32;Content Designer|Design|120|38;' +
  'Architect|Design|540|30;Industrial Designer|Design|80|30;Marketing Manager|Marketing|640|40;' +
  'Digital Marketing Executive|Marketing|720|28;Brand Manager|Marketing|380|42;' +
  'Growth Marketer|Marketing|180|38;Content Strategist|Marketing|160|34;' +
  'SEO Specialist|Marketing|140|30;Social Media Manager|Marketing|260|28;' +
  'Marketing Analyst|Marketing|310|34;PR Manager|Marketing|190|36;' +
  'Communications Officer|Marketing|340|30;CRM Manager|Marketing|120|38;' +
  'Performance Marketing Manager|Marketing|150|42;Market Researcher|Marketing|280|30;' +
  'Account Manager|Marketing|520|32;Operations Manager|Operations|680|40;' +
  'Operations Analyst|Operations|450|34;Supply Chain Analyst|Operations|290|34;' +
  'Logistics Coordinator|Operations|210|28;Procurement Specialist|Operations|180|34;' +
  'Project Manager|Operations|1050|42;Programme Manager|Operations|260|55;' +
  'Business Operations Associate|Operations|240|38;Chief of Staff|Operations|90|60;' +
  'Customer Success Manager|Operations|310|34;Partnerships Manager|Operations|200|42;' +
  'Strategy & Operations Associate|Operations|170|45;Process Improvement Analyst|Operations|120|36;' +
  'Head of Operations|Operations|70|75;Civil Service Fast Streamer|Public sector|620|30;' +
  'Policy Advisor|Public sector|540|32;Government Economist|Public sector|180|34;' +
  'Parliamentary Researcher|Public sector|140|26;Diplomat|Public sector|90|30;' +
  'Local Government Officer|Public sector|260|28;Charity Programme Manager|Public sector|210|32;' +
  'Policy Analyst|Public sector|380|32;Social Researcher|Public sector|190|30;' +
  'Intelligence Analyst|Public sector|120|34;Urban Planner|Public sector|160|30;' +
  'Teacher|Public sector|980|30;Health Data Analyst|Healthcare|160|34;' +
  'Clinical Research Associate|Healthcare|240|32;NHS Graduate Management Trainee|Healthcare|310|30;' +
  'Medical Writer|Healthcare|120|32;Health Economist|Healthcare|140|38;' +
  'Biomedical Scientist|Healthcare|380|30;Regulatory Affairs Associate|Healthcare|110|34;' +
  'Public Health Analyst|Healthcare|180|32;Pharmaceutical Sales Rep|Healthcare|90|34;' +
  'Medtech Product Manager|Healthcare|60|48;Hospital Operations Manager|Healthcare|80|40;' +
  'Energy Analyst|Energy|180|36;Sustainability Analyst|Energy|240|34;' +
  'Renewable Energy Engineer|Energy|160|36;ESG Analyst|Energy|210|38;' +
  'Climate Policy Advisor|Energy|120|34;Carbon Markets Analyst|Energy|60|40;Energy Trader|Energy|90|55;' +
  'Environmental Consultant|Energy|290|30;Grid Engineer|Energy|70|38;' +
  'Energy Project Manager|Energy|80|45;Journalist|Media|460|26;Editor|Media|210|30;' +
  'Producer|Media|260|28;Content Producer|Media|190|28;Media Planner|Media|240|28;' +
  'Games Designer|Media|140|30;Games Producer|Media|70|36;Music Business Manager|Media|60|28;' +
  'Sports Analyst|Media|90|32;Broadcast Researcher|Media|110|24'

// ROLES = [{ name: 'Product Manager', sector: 'Tech', alumni: 1240, sal: 48 }, ...]
export const ROLES = ROLE_TEXT.split(';').map((entry) => {
  const [name, sector, alumni, sal] = entry.split('|')
  return { name, sector, alumni: Number(alumni), sal: Number(sal) }
})

// Shown before the student types anything (the screen lists the first 3).
export const POPULAR = ['Product Manager', 'Management Consultant', 'Investment Banking Analyst', 'Software Engineer', 'Data Analyst']
export const POPULAR_SHOWN = 3

// How many roles a student can pick.
export const MAX_ROLES = 3

// "Not sure yet? Suggest routes for me": the roles the agent proposes, best fit first.
// In the real app Claude would choose these from the student's CV and values; for now they are
// fixed examples written for the demo student (Maya: MSc Business Analytics, Monzo internship).
export const AI_SUGGESTIONS = [
  { name: 'Data Product Analyst', sector: 'Tech', alumni: 180, sal: 40, fit: 86, why: 'SQL/Python + your Monzo analysis work.' },
  { name: 'Business Analyst', sector: 'Consulting', alumni: 760, sal: 38, fit: 82, why: 'MSc Business Analytics + stakeholder work at Monzo.' },
  { name: 'Product Manager', sector: 'Tech', alumni: 1240, sal: 48, fit: 79, why: 'Monzo internship + your marketplace interest.' },
  { name: 'Strategy Analyst', sector: 'Consulting', alumni: 410, sal: 42, fit: 77, why: 'You rank Development highest — strategy rotations score it.' },
  { name: 'Growth Analyst', sector: 'Tech', alumni: 150, sal: 37, fit: 74, why: 'Growth experiments at Monzo + Python.' },
  { name: 'Analytics Consultant', sector: 'Consulting', alumni: 390, sal: 41, fit: 71, why: 'BSc Computer Science + “Using your abilities”.' },
]

// ── 07b · Work values (from the UCL Careers values activity) ──
// [title, description]. A value's key is its position in this list ('0', '1', ...).
export const WORK_VALUES = [
  ['Using your abilities', 'Stretching yourself. Not a job you could do one-handed.'],
  ['Development', 'Room to expand your role and learn new things.'],
  ['Accomplishment', 'Clear goals. You can see the result of your effort.'],
  ['Variety of task', 'Every day is different because you do different things.'],
  ['Money', 'Larger than average salary, perks on top.'],
  ['Creativity', 'Generate new ideas. Innovate and be original.'],
  ['Colleagues', 'People who are easy to get on with, and time to socialise.'],
  ['Advancement', 'Opportunities to be promoted to higher positions.'],
  ['Autonomy', 'Freedom to do things when and how you want.'],
  ['Security', "You're unlikely to lose your job or be job-hunting often."],
  ['Helping society', 'Doing something that benefits society.'],
  ['Hours', 'No more than average hours. Work fits around your life.'],
  ['Prestige environment', 'Where you work is seen as a major player in its field.'],
  ['Fun', 'You can be light-hearted. Not serious all the time.'],
]

// How many values the student picks before rating them.
export const TOP_VALUES = 5

// The labels above the 1-5 circles.
export const RATING_LABELS = ['Not at all', 'A little', 'Somewhat', 'Very', 'Essential']

// ── 08 · Suggested areas ─────────────────────────────────────
// g = salary growth per year (%), start = median start (£k), range = start range, alumni = UCL alumni.
export const AREAS = [
  { id: 'prod', title: 'Product & strategy', desc: 'Monzo internship + marketplace interest. PM, product ops, strategy and growth roles.', g: 15, start: 42, range: '£42–55k', alumni: 312 },
  { id: 'anal', title: 'Analytics & insight', desc: 'Closest to your MSc and SQL/Python/Tableau. Business, data and product analyst roles.', g: 12, start: 38, range: '£35–45k', alumni: 540 },
  { id: 'cons', title: 'Consulting & advisory', desc: 'Strong SoM pipeline into strategy and tech consulting; stakeholder work transfers directly.', g: 14, start: 48, range: '£45–55k', alumni: 890 },
  { id: 'mkt', title: 'Marketplaces & operations', desc: 'Builds on your Deliveroo placement. Ops, supply and partnerships roles at two-sided platforms.', g: 11, start: 35, range: '£32–40k', alumni: 95 },
]
// The old name used by the design file, kept so other screens can import either.
export const AREAS0 = AREAS

// The catalogue the "Add an area" search picks from. tags = words that make an area match.
export const AREA_LIBRARY = [
  { title: 'Product management', desc: 'Your Monzo product internship is the direct route; the MSc adds the analytics PMs lean on.', g: 15, start: 45, range: '£42–52k', alumni: 180, tags: ['product', 'pm', 'manage', 'strategy', 'build', 'app'] },
  { title: 'Fintech', desc: 'Monzo on your CV plus SQL/Python — fintech product and analytics teams hire for exactly that mix.', g: 14, start: 44, range: '£40–50k', alumni: 260, tags: ['fintech', 'finance', 'bank', 'payments', 'money', 'crypto'] },
  { title: 'Data engineering', desc: 'BSc Computer Science + Python/SQL covers the core; a step up from analytics into pipelines.', g: 13, start: 46, range: '£42–55k', alumni: 210, tags: ['data', 'engineer', 'pipeline', 'technical', 'code', 'software'] },
  { title: 'Sustainability & climate', desc: 'Analytics roles in climate tech and ESG reporting value your Tableau and business-analytics training.', g: 10, start: 36, range: '£32–42k', alumni: 70, tags: ['sustain', 'climate', 'green', 'esg', 'environment', 'impact', 'society'] },
  { title: 'Sports business', desc: 'Commercial and analytics roles at clubs, leagues and sports-tech — your Padel and snowsports societies help the network.', g: 9, start: 32, range: '£28–38k', alumni: 45, tags: ['sport', 'football', 'club', 'athlet', 'fitness', 'padel', 'snow', 'surf'] },
  { title: 'Growth & marketing analytics', desc: 'Experimentation and funnel work — your SQL/Tableau skills and Monzo growth exposure map straight on.', g: 12, start: 38, range: '£34–44k', alumni: 150, tags: ['marketing', 'growth', 'brand', 'creative', 'content', 'social'] },
  { title: 'Venture & startups', desc: 'Entrepreneurs Society + a product background suits early-stage ops or VC analyst roles.', g: 16, start: 40, range: '£35–48k', alumni: 120, tags: ['startup', 'venture', 'vc', 'founder', 'entrepreneur', 'invest', 'business'] },
  { title: 'Tech consulting', desc: 'Strong SoM pipeline; Computer Science makes you credible on implementation, not just slides.', g: 14, start: 47, range: '£44–54k', alumni: 410, tags: ['consult', 'advis', 'tech', 'technology', 'digital', 'transformation'] },
  { title: 'Health & medtech', desc: 'Health data and digital-health product teams want analysts with Python and a business lens.', g: 11, start: 38, range: '£34–44k', alumni: 85, tags: ['health', 'medical', 'medtech', 'nhs', 'care', 'bio'] },
  { title: 'Media & entertainment', desc: 'Streaming and gaming platforms run on product analytics — your toolkit transfers directly.', g: 10, start: 34, range: '£30–40k', alumni: 90, tags: ['media', 'film', 'music', 'game', 'gaming', 'entertain', 'tv', 'stream'] },
  { title: 'Public sector & policy', desc: 'Government digital and data roles reward your MSc; the Leadership & Management society is a plus.', g: 7, start: 33, range: '£30–36k', alumni: 160, tags: ['public', 'policy', 'government', 'civil', 'charity', 'non-profit', 'ngo'] },
]

// Median salary in a given year after starting (£k), growing by `growth`% a year.
export function salaryAt(start, growth, year) {
  return start * Math.pow(1 + growth / 100, year)
}

// Quick-pick chips in the "Add an area" sheet.
export const AREA_CHIPS = ['Product management', 'Fintech', 'Data engineering', 'Sustainability', 'Sports business', 'Venture & startups']

// ── 09 · Gaps ────────────────────────────────────────────────
// The five scores, in this order everywhere.
export const CATEGORIES = ['Academics', 'Skills', 'Teamwork', 'Experience', 'Leadership']
export const CATS = CATEGORIES

// The student's own scores in each category (same order as CATEGORIES).
export const MY_SCORES = [85, 70, 65, 55, 40]

// For each area: alumni scores, fit %, its chart colour, the biggest gap and the next step to close it.
export const GAPS = {
  prod: { al: [78, 76, 74, 70, 62], fit: 62, color: '#FFC46B', gap: 'Something you shipped and owned', why: 'Monzo reads as analysis, not ownership', next: 'Big Idea pitch night · 29 Oct', vs: 'product' },
  anal: { al: [80, 72, 66, 63, 45], fit: 81, color: '#3DD6C1', gap: 'A portfolio project in SQL + Tableau', why: 'Your closest fit — experience is the only real gap', next: 'Data Viz Clinic · 23 Oct', vs: 'analytics' },
  cons: { al: [82, 72, 80, 66, 68], fit: 58, color: '#FF8A7A', gap: 'Case interview practice', why: 'Alumni score higher on teamwork and leadership', next: 'Deloitte case rounds · Career Lab 27 Oct', vs: 'consulting' },
  mkt: { al: [74, 68, 70, 50, 64], fit: 69, color: '#6FB8FF', gap: 'Own a supply-side project end to end', why: 'Deliveroo makes experience your strongest score; leadership lags', next: 'Deliveroo alumni panel · 5 Nov', vs: 'marketplaces & ops' },
}

// Colours for areas the student adds themselves, used in turn.
const CUSTOM_COLORS = ['#F58BD8', '#9BE37D', '#FFD3A3', '#B5B8FF']

// The gap details for any area, including ones the student added (they get a gentle default).
//   customIndex = where the area sits in the student's own list (picks its colour)
export function gapFor(area, customIndex = 0) {
  return (
    GAPS[area.id] ?? {
      al: [76, 72, 70, 66, 60],
      fit: 60,
      color: CUSTOM_COLORS[customIndex % CUSTOM_COLORS.length],
      gap: 'Talk to an alumnus in this area',
      why: 'We’ll sharpen this as you save routes and events',
      next: 'LinkedIn Lab · 20 Oct',
      vs: area.title.toLowerCase(),
    }
  )
}

// Which category has the biggest gap (alumni score minus yours)? Returns its position.
export function worstCategory(alumniScores) {
  const gaps = alumniScores.map((score, i) => score - MY_SCORES[i])
  return gaps.indexOf(Math.max(...gaps))
}
