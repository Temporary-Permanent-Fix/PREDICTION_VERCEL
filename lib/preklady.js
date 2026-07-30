// Preklady rozhrania. Kľúč = slovenský originál, hodnoty = cs / en / uk.
// Čokoľvek, čo tu nie je, sa zobrazí po slovensky (bezpečný fallback),
// takže slovník sa dá dopĺňať postupne bez zásahu do appky.

export const JAZYKY = [
  ["sk", "SK"],
  ["cs", "CS"],
  ["en", "EN"],
  ["uk", "UA"],
];

const S = {
  // --- navigácia a sekcie -------------------------------------------------
  "Vzniky": ["Vzniky", "Orders created", "Створення"],
  "Triedenie": ["Třídění", "Sorting", "Сортування"],
  "Príjem": ["Příjem", "Receiving", "Приймання"],
  "Distribúcia": ["Distribuce", "Distribution", "Дистрибуція"],
  "Kvalita": ["Kvalita", "Quality", "Якість"],
  "Udalosti": ["Události", "Events", "Події"],
  "KPI": ["KPI", "KPI", "KPI"],
  "Výkony": ["Výkony", "Rates", "Продуктивність"],
  "Model": ["Model", "Model", "Модель"],
  "Dáta": ["Data", "Data", "Дані"],
  "Predikcia": ["Predikce", "Forecast", "Прогноз"],
  "Zvozy": ["Svozy", "Dispatches", "Відвантаження"],
  "Prepočet predikcie": ["Přepočet predikce", "Intraday recalculation", "Перерахунок прогнозу"],
  "Zadávanie dát": ["Zadávání dat", "Data entry", "Введення даних"],
  "Anomálie": ["Anomálie", "Anomalies", "Аномалії"],

  // --- spoločné pojmy -----------------------------------------------------
  "Dátum": ["Datum", "Date", "Дата"],
  "Dátum predikcie": ["Datum predikce", "Forecast date", "Дата прогнозу"],
  "Dátum (prevádzkový deň)": ["Datum (provozní den)", "Date (operational day)", "Дата (операційний день)"],
  "Prevádzkový deň": ["Provozní den", "Operational day", "Операційний день"],
  "Deň": ["Den", "Day", "День"],
  "Dní": ["Dní", "Days", "Днів"],
  "Hodina": ["Hodina", "Hour", "Година"],
  "Hodiny": ["Hodiny", "Hours", "Години"],
  "Od": ["Od", "From", "Від"],
  "Do": ["Do", "To", "До"],
  "Typ": ["Typ", "Type", "Тип"],
  "Názov": ["Název", "Name", "Назва"],
  "Popis": ["Popis", "Description", "Опис"],
  "Popis (voliteľné)": ["Popis (volitelné)", "Description (optional)", "Опис (необов'язково)"],
  "Zdroj": ["Zdroj", "Source", "Джерело"],
  "Proces": ["Proces", "Process", "Процес"],
  "Objem": ["Objem", "Volume", "Обсяг"],
  "Objem (JBL)": ["Objem (JBL)", "Volume (JBL)", "Обсяг (JBL)"],
  "Jobline": ["Jobline", "Joblines", "Jobline"],
  "Joblines": ["Joblines", "Joblines", "Joblines"],
  "Joblines spolu (deň)": ["Joblines celkem (den)", "Total joblines (day)", "Joblines разом (день)"],
  "Podiel": ["Podíl", "Share", "Частка"],
  "Odchýlka": ["Odchylka", "Deviation", "Відхилення"],
  "Skutočnosť": ["Skutečnost", "Actual", "Факт"],
  "Očakávané": ["Očekávané", "Expected", "Очікуване"],
  "Obdobie": ["Období", "Period", "Період"],
  "Súbor": ["Soubor", "File", "Файл"],
  "Obsah": ["Obsah", "Content", "Вміст"],
  "Heslo": ["Heslo", "Password", "Пароль"],
  "Default": ["Výchozí", "Default", "За замовчуванням"],
  "Joblines": ["Joblines", "Joblines", "Joblines"],
  "Jobline": ["Jobline", "Joblines", "Jobline"],

  // --- predikcia ----------------------------------------------------------
  "Faktor dňa v týždni": ["Faktor dne v týdnu", "Day-of-week factor", "Фактор дня тижня"],
  "Denná úroveň modelu": ["Denní úroveň modelu", "Model daily level", "Денний рівень моделі"],
  "Skutočnosť vs. model · posledných 60 dní": ["Skutečnost vs. model · posledních 60 dní", "Actual vs. model · last 60 days", "Факт проти моделі · останні 60 днів"],
  "Človekohodiny": ["Člověkohodiny", "Man-hours", "Людино-години"],
  "Človekohodiny na dobehnutie": ["Člověkohodiny na dohnání", "Man-hours to catch up", "Людино-години на надолуження"],

  // --- zvozy --------------------------------------------------------------
  "Deň zvozu": ["Den svozu", "Dispatch day", "День відвантаження"],
  "Zvoz (slot)": ["Svoz (slot)", "Dispatch (slot)", "Відвантаження (слот)"],
  "Zvozy · najbližších 7 dní": ["Svozy · nejbližších 7 dní", "Dispatches · next 7 days", "Відвантаження · наступні 7 днів"],
  "Vznik": ["Vznik", "Created", "Створено"],
  "Zvozy odchádzajú prevažne v noci (špička 2:00–5:00) – profil z posledných 60 dní zvozov.":
    ["Svozy odjíždějí převážně v noci (špička 2:00–5:00) – profil z posledních 60 dní svozů.",
     "Dispatches leave mostly at night (peak 2:00–5:00) – profile from the last 60 days.",
     "Відвантаження здебільшого вночі (пік 2:00–5:00) – профіль за останні 60 днів."],
  "Predikcia expedičnej záťaže (zvozov) z vznikov. Každá hodina vzniku má z historických dát (OLAP, 10/2025–07/2026)\n        vlastný podiel „koľko z toho reálne odíde“ a rozdelenie na deň D / D+1 / D+2+. Vzniky za minulé dni sa berú\n        zo skutočnosti, budúce z modelu vznikov.":
    ["Predikce expediční zátěže (svozů) z vzniků. Každá hodina vzniku má z historických dat vlastní podíl „kolik z toho reálně odjede“ a rozdělení na den D / D+1 / D+2+. Vzniky za minulé dny se berou ze skutečnosti, budoucí z modelu.",
     "Forecast of dispatch load from created orders. Each creation hour has its own historical share of what actually ships and a split across D / D+1 / D+2+. Past days use actuals, future days the model.",
     "Прогноз навантаження відвантажень зі створених замовлень. Кожна година створення має власну історичну частку того, що реально від'їде, і розподіл на D / D+1 / D+2+. Минулі дні беруться з факту, майбутні з моделі."],
  "Približne 88 % vzniknutých jobline reálne prejde zvozom (zvyšok sú interné/systémové joby bez expedície) –\n          z toho ~26 % odíde v deň vzniku a ~65 % na druhý deň.":
    ["Přibližně 88 % vzniklých jobline reálně projde svozem (zbytek jsou interní joby bez expedice) – z toho ~26 % odjede v den vzniku a ~65 % druhý den.",
     "About 88 % of created joblines actually ship (the rest are internal jobs) – roughly 26 % on the day of creation and 65 % the next day.",
     "Близько 88 % створених jobline реально відвантажуються (решта — внутрішні завдання) — з них ~26 % у день створення і ~65 % наступного дня."],

  // --- prepočet -----------------------------------------------------------
  "Stav do hodiny": ["Stav do hodiny", "Progress up to hour", "Стан до години"],
  "Vzniknuté JBL do hodiny": ["Vzniklé JBL do hodiny", "JBL created up to hour", "Створені JBL до години"],
  "Vypikované JBL (voliteľné)": ["Vypikované JBL (volitelné)", "Picked JBL (optional)", "Зібрані JBL (необов'язково)"],
  "Odhad konca dňa (extrapolácia)": ["Odhad konce dne (extrapolace)", "End-of-day estimate (extrapolation)", "Оцінка кінця дня (екстраполяція)"],
  "Odhad EOD": ["Odhad EOD", "EOD estimate", "Оцінка EOD"],
  "Ešte pribudne": ["Ještě přibude", "Still to come", "Ще додасться"],
  "Deň spolu": ["Den celkem", "Day total", "День разом"],
  "Pick stav": ["Pick stav", "Pick progress", "Стан Pick"],
  "Porovnávací deň": ["Porovnávací den", "Reference day", "Порівняльний день"],
  "Porovnávacie dni (kontrola dát)": ["Porovnávací dny (kontrola dat)", "Reference days (data check)", "Порівняльні дні (перевірка даних)"],
  "Projekcia kumulatívnej krivky dňa": ["Projekce kumulativní křivky dne", "Projected cumulative day curve", "Прогноз кумулятивної кривої дня"],
  "Snímky priebehu": ["Snímky průběhu", "Progress snapshots", "Знімки перебігу"],
  "Uložiť snímku": ["Uložit snímek", "Save snapshot", "Зберегти знімок"],
  "Zadaj vzniknuté JBL – odhad sa prepočíta okamžite.":
    ["Zadej vzniklé JBL – odhad se přepočítá okamžitě.",
     "Enter created JBL – the estimate updates instantly.",
     "Введи створені JBL – оцінка перерахується миттєво."],
  "Odhad konca dňa = dnešný stav ÷ podiel, ktorý porovnávacie dni dosiahli do tej istej hodiny.":
    ["Odhad konce dne = dnešní stav ÷ podíl, který porovnávací dny dosáhly do téže hodiny.",
     "End-of-day estimate = today's progress ÷ the share reference days reached by the same hour.",
     "Оцінка кінця дня = сьогоднішній стан ÷ частка, яку порівняльні дні досягли до тієї ж години."],

  // --- zadávanie dát ------------------------------------------------------
  "Uložiť záznam": ["Uložit záznam", "Save record", "Зберегти запис"],
  "Anomália": ["Anomálie", "Anomaly", "Аномалія"],
  "Anomália (voliteľné)": ["Anomálie (volitelné)", "Anomaly (optional)", "Аномалія (необов'язково)"],
  "Zatiaľ žiadne používateľské záznamy – model beží na baseline dátach.":
    ["Zatím žádné uživatelské záznamy – model běží na baseline datech.",
     "No user records yet – the model runs on baseline data.",
     "Поки немає користувацьких записів – модель працює на базових даних."],

  // --- anomálie a backlog -------------------------------------------------
  "Priradiť výnimku": ["Přiřadit výjimku", "Assign exception", "Призначити виняток"],
  "Typ výnimky": ["Typ výjimky", "Exception type", "Тип винятку"],
  "Výnimka": ["Výjimka", "Exception", "Виняток"],
  "Uložiť výnimku": ["Uložit výjimku", "Save exception", "Зберегти виняток"],
  "Backlog z hodinových anomálií": ["Backlog z hodinových anomálií", "Backlog from hourly anomalies", "Беклог з погодинних аномалій"],
  "Backlog (nespracované JBL)": ["Backlog (nezpracované JBL)", "Backlog (unprocessed JBL)", "Беклог (необроблені JBL)"],
  "Backlog objem": ["Objem backlogu", "Backlog volume", "Обсяг беклогу"],
  "Postihnuté hodiny": ["Zasažené hodiny", "Affected hours", "Уражені години"],
  "Dopad": ["Dopad", "Impact", "Вплив"],
  "Hodiny navyše": ["Hodiny navíc", "Extra hours", "Додаткові години"],
  "Cieľový deň": ["Cílový den", "Target day", "Цільовий день"],
  "Z dňa": ["Ze dne", "From day", "З дня"],
  "Na deň": ["Na den", "To day", "На день"],
  "Pôvod": ["Původ", "Origin", "Походження"],
  "Nespracovaný objem stráca prioritu a čaká na ďalší zvoz svojej linky – zmeškaný slot ide na rovnakú hodinu nasledujúceho dňa (podľa dát 64 % objemu drží hodinu slotu). Rozpad podľa cieľových zvozov:":
    ["Nezpracovaný objem ztrácí prioritu a čeká na další svoz své linky – zmeškaný slot jde na stejnou hodinu následujícího dne (podle dat 64 % objemu drží hodinu slotu). Rozpad podle cílových svozů:",
     "Unprocessed volume loses priority and waits for the line's next dispatch – a missed slot moves to the same hour the next day (data show 64 % keep the slot hour). Breakdown by target dispatch:",
     "Необроблений обсяг втрачає пріоритет і чекає наступного відвантаження своєї лінії – пропущений слот переходить на ту саму годину наступного дня (за даними 64 % зберігають годину слоту). Розподіл за цільовими відвантаженнями:"],
  "Backlog zahŕňa aj distribučné jobline (medzisklad, ~12 % objemu) – tá práca sa musí spraviť tak či tak; na zvozové sloty nižšie sa viaže expedičná časť, distribučná sa dobieha nasledujúci deň mimo zákazníckych zvozov.":
    ["Backlog zahrnuje i distribuční jobline (mezisklad, ~12 % objemu) – ta práce se musí udělat tak či tak; na svozové sloty níže se váže expediční část, distribuční se dohání následující den mimo zákaznické svozy.",
     "The backlog includes distribution joblines (~12 % of volume) – that work must be done anyway; the dispatch slots below cover the shipping part, while distribution is caught up the next day outside customer dispatches.",
     "Беклог включає й дистрибуційні jobline (~12 % обсягу) – цю роботу все одно треба зробити; слоти нижче стосуються експедиційної частини, дистрибуція надолужується наступного дня поза клієнтськими відвантаженнями."],
  "Prenesený backlog sa pripočíta k objemom v záložkách KPI (človekohodiny) a Zvozy pre cieľové dni.":
    ["Přenesený backlog se připočte k objemům v záložkách KPI (člověkohodiny) a Svozy pro cílové dny.",
     "The transferred backlog is added to volumes in the KPI (man-hours) and Dispatches tabs for the target days.",
     "Перенесений беклог додається до обсягів у вкладках KPI (людино-години) і Відвантаження для цільових днів."],

  // --- udalosti -----------------------------------------------------------
  "Typ udalosti": ["Typ události", "Event type", "Тип події"],
  "Koeficient": ["Koeficient", "Coefficient", "Коефіцієнт"],
  "Koef.": ["Koef.", "Coef.", "Коеф."],
  "Uložiť udalosť": ["Uložit událost", "Save event", "Зберегти подію"],
  "Odhad koeficientu z histórie": ["Odhad koeficientu z historie", "Coefficient estimate from history", "Оцінка коефіцієнта з історії"],
  "Vypočítať koeficient": ["Vypočítat koeficient", "Calculate coefficient", "Обчислити коефіцієнт"],
  "Predpočítané koeficienty z histórie": ["Předpočítané koeficienty z historie", "Pre-computed coefficients from history", "Попередньо обчислені коефіцієнти"],
  "Koeficient násobí predikciu v danom rozsahu (1.05 = +5 %). Historické udalosti sa zároveň\n        odfiltrujú zo sezónnosti modelu. Koeficient sa predvyplní z historických dát podľa typu – môžeš ho upraviť.":
    ["Koeficient násobí predikci v daném rozsahu (1.05 = +5 %). Historické události se zároveň odfiltrují ze sezónnosti modelu. Koeficient se předvyplní z historických dat podle typu – můžeš ho upravit.",
     "The coefficient multiplies the forecast over the given range (1.05 = +5 %). Historical events are also filtered out of the model's seasonality. The value is pre-filled from history by type – you can adjust it.",
     "Коефіцієнт множить прогноз у заданому діапазоні (1.05 = +5 %). Історичні події також фільтруються із сезонності моделі. Значення підставляється з історії за типом – його можна змінити."],
  "Alza dni / Mega zľavy / AlzaPlus+: log-lineárna regresia na reálnom promo kalendári feb–jún 2026.\n          Black Friday: BF víkend 2025 z vznikov. Výplatný termín: priemer faktora dní 10.–16. Sviatok: medián prepadu anomálnych dní.":
    ["Alza dny / Mega slevy / AlzaPlus+: log-lineární regrese na reálném promo kalendáři únor–červen 2026. Black Friday: BF víkend 2025. Výplatní termín: průměr faktoru dnů 10.–16. Svátek: medián propadu anomálních dnů.",
     "Alza Days / Mega Sale / AlzaPlus+: log-linear regression on the real promo calendar Feb–Jun 2026. Black Friday: BF weekend 2025. Payday: average factor of days 10–16. Holiday: median drop of anomalous days.",
     "Alza Days / Mega Sale / AlzaPlus+: лог-лінійна регресія на реальному промо-календарі лютий–червень 2026. Black Friday: вихідні BF 2025. День зарплати: середній фактор днів 10–16. Свято: медіана падіння аномальних днів."],
  "Koeficient 1.36 vypočítaný z vznikov počas BF víkendu 2025 (27.11.–1.12.) oproti okolitým týždňom.":
    ["Koeficient 1.36 vypočtený z vzniků během BF víkendu 2025 (27.11.–1.12.) oproti okolním týdnům.",
     "Coefficient 1.36 derived from orders during the 2025 BF weekend (Nov 27 – Dec 1) versus surrounding weeks.",
     "Коефіцієнт 1.36 обчислено зі створених замовлень під час вихідних BF 2025 (27.11–1.12) проти сусідніх тижнів."],

  // --- kvalita ------------------------------------------------------------
  "Kvalita (Ø denných)": ["Kvalita (Ø denních)", "Quality (avg. of daily)", "Якість (сер. денних)"],
  "Po limite": ["Po limitu", "Past deadline", "Після ліміту"],
  "Nízke stĺpce = hodiny, kde sa koncentrujú oneskorené dokončenia.":
    ["Nízké sloupce = hodiny, kde se koncentrují opožděná dokončení.",
     "Low bars = hours where late completions concentrate.",
     "Низькі стовпці = години, де концентруються запізнілі завершення."],
  "Chýba súbor `kvalita_denne.csv` – vygeneruj ho cez `tools/quality_to_data.py`.":
    ["Chybí soubor `kvalita_denne.csv` – nahraj QUALITY export v záložce Data.",
     "Missing `kvalita_denne.csv` – upload the QUALITY export in the Data tab.",
     "Бракує файлу `kvalita_denne.csv` – завантаж експорт QUALITY у вкладці «Дані»."],

  // --- KPI a výkony -------------------------------------------------------
  "Výkon": ["Výkon", "Rate", "Продуктивність"],
  "Výkon (JBL/os/h)": ["Výkon (JBL/os/h)", "Rate (JBL/person/h)", "Продуктивність (JBL/особу/год)"],
  "Plošný": ["Plošný", "Global", "Загальний"],
  "Efektívny": ["Efektivní", "Effective", "Ефективний"],
  "Aktuálne uložené": ["Aktuálně uložené", "Currently saved", "Наразі збережено"],
  "Nová hodnota": ["Nová hodnota", "New value", "Нове значення"],
  "Uložiť plošné výkony": ["Uložit plošné výkony", "Save global rates", "Зберегти загальні норми"],
  "Proces pre hodinový plán": ["Proces pro hodinový plán", "Process for hourly plan", "Процес для погодинного плану"],
  "Zamknúť": ["Zamknout", "Lock", "Заблокувати"],
  "Plošné výkony môžu meniť len poverení ľudia. Zadaj heslo – platí do zatvorenia karty prehliadača.":
    ["Plošné výkony mohou měnit jen pověření lidé. Zadej heslo – platí do zavření karty prohlížeče.",
     "Only authorised people may change global rates. Enter the password – valid until the browser tab is closed.",
     "Загальні норми можуть змінювати лише уповноважені. Введи пароль – діє до закриття вкладки браузера."],
  "Žiadne – všetky dni idú podľa plošných výkonov.":
    ["Žádné – všechny dny jdou podle plošných výkonů.",
     "None – all days follow the global rates.",
     "Немає – усі дні за загальними нормами."],
  "Pridať alebo zmeniť dennú úpravu: záložka KPI → stĺpec „Úprava pre deň“.":
    ["Přidat nebo změnit denní úpravu: záložka KPI → sloupec „Úprava pro den“.",
     "Add or change a daily override: KPI tab → “Override for day” column.",
     "Додати або змінити денне коригування: вкладка KPI → стовпець «Коригування на день»."],

  // --- model a backtest ---------------------------------------------------
  "MAPE (priem. % chyba)": ["MAPE (prům. % chyba)", "MAPE (avg. % error)", "MAPE (сер. % похибки)"],
  "MAE (priem. abs. chyba)": ["MAE (prům. abs. chyba)", "MAE (avg. abs. error)", "MAE (сер. абс. похибка)"],
  "Dní s chybou do ±5 000": ["Dní s chybou do ±5 000", "Days within ±5,000", "Днів з похибкою до ±5 000"],
  "Bias (systematický posun)": ["Bias (systematický posun)", "Bias (systematic shift)", "Зсув (систематичний)"],
  "Backtest · presnosť predikcie „deň vopred“ (posledných 30 dní)":
    ["Backtest · přesnost predikce „den dopředu“ (posledních 30 dní)",
     "Backtest · day-ahead forecast accuracy (last 30 days)",
     "Бектест · точність прогнозу «на день уперед» (останні 30 днів)"],
  "Pre každý deň sa model natrénuje len na dátach do predchádzajúceho dňa a predikcia sa porovná so skutočnosťou – presne ako v reálnom použití. Dni s výnimkou sa preskakujú.":
    ["Pro každý den se model natrénuje jen na datech do předchozího dne a predikce se porovná se skutečností – přesně jako v reálném použití. Dny s výjimkou se přeskakují.",
     "For each day the model is trained only on data up to the previous day and compared with the actual – exactly as in real use. Days with an exception are skipped.",
     "Для кожного дня модель навчається лише на даних до попереднього дня і порівнюється з фактом – точно як у реальному використанні. Дні з винятком пропускаються."],
  "Tabuľka: 6 najhorších dní – kandidáti na chýbajúcu udalosť (promo) alebo výnimku (výpadok).":
    ["Tabulka: 6 nejhorších dní – kandidáti na chybějící událost (promo) nebo výjimku (výpadek).",
     "Table: the 6 worst days – candidates for a missing event (promo) or exception (outage).",
     "Таблиця: 6 найгірших днів – кандидати на відсутню подію (промо) або виняток (збій)."],

  // --- import dát ---------------------------------------------------------
  "Rozpoznané súbory": ["Rozpoznané soubory", "Recognised files", "Розпізнані файли"],
  "Pripravené dáta": ["Připravená data", "Prepared data", "Підготовлені дані"],
  "Zahodiť": ["Zahodit", "Discard", "Відхилити"],
  "Ako často importovať": ["Jak často importovat", "How often to import", "Як часто імпортувати"],
  "Model kotví predikciu na posledné dni skutočnosti, takže čerstvý OLAP export raz týždenne drží presnosť na\n          úrovni „deň vopred“. VOLUMES a QUALITY stačí podľa potreby – ovplyvňujú triedenie, príjem a kvalitu.\n          Medzi importmi vieš jednotlivé dni dopĺňať ručne v Zadávaní dát.":
    ["Model kotví predikci na poslední dny skutečnosti, takže čerstvý OLAP export jednou týdně drží přesnost na úrovni „den dopředu“. VOLUMES a QUALITY stačí podle potřeby. Mezi importy lze jednotlivé dny doplňovat ručně v Zadávání dat.",
     "The model anchors the forecast on the latest actuals, so a fresh OLAP export once a week keeps day-ahead accuracy. VOLUMES and QUALITY as needed. Between imports you can add individual days manually in Data entry.",
     "Модель прив'язує прогноз до останніх фактичних днів, тож свіжий експорт OLAP раз на тиждень тримає точність рівня «на день уперед». VOLUMES і QUALITY – за потреби. Між імпортами окремі дні можна додавати вручну у «Введенні даних»."],

  // --- druhý priechod: stavový riadok, hlášky, štítky ---------------------
  "zdroj": ["zdroj", "source", "джерело"],
  "tréning": ["trénink", "training", "навчання"],
  "posledné dáta": ["poslední data", "latest data", "останні дані"],
  "úroveň": ["úroveň", "level", "рівень"],
  "Hodinová predikcia": ["Hodinová predikce", "Hourly forecast", "Погодинний прогноз"],
  "Denná predikcia · najbližších": ["Denní predikce · nejbližších", "Daily forecast · next", "Денний прогноз · наступні"],
  "dní)": ["dní)", "days)", "днів)"],
  "Hodinový profil zvozov": ["Hodinový profil svozů", "Hourly dispatch profile", "Погодинний профіль відвантажень"],
  "Potrební ľudia po hodinách": ["Potřební lidé po hodinách", "People needed by hour", "Потрібні люди по годинах"],
  "Kvalita podľa hodiny dňa · posledných": ["Kvalita podle hodiny dne · posledních", "Quality by hour of day · last", "Якість за годиною дня · останні"],
  "Zadané záznamy": ["Zadané záznamy", "Entered records", "Введені записи"],
  "Evidované výnimky (": ["Evidované výjimky (", "Recorded exceptions (", "Зафіксовані винятки ("],
  "Prenesené backlogy (": ["Přenesené backlogy (", "Transferred backlogs (", "Перенесені беклоги ("],
  "Denné úpravy výkonov (": ["Denní úpravy výkonů (", "Daily rate overrides (", "Денні коригування норм ("],
  "bez priradenej výnimky": ["bez přiřazené výjimky", "without an assigned exception", "без призначеного винятку"],
  "označených).": ["označených).", "selected).", "позначених)."],
  "celý deň": ["celý den", "whole day", "весь день"],
  "nepriradená": ["nepřiřazená", "unassigned", "не призначено"],
  "nenastavené": ["nenastaveno", "not set", "не задано"],
  "vo Výkonoch": ["ve Výkonech", "in Rates", "у «Продуктивності»"],
  "chyba": ["chyba", "error", "помилка"],
  "jobline na deň": ["jobline na den", "joblines per day", "jobline на день"],
  "napr. Alza dni august": ["např. Alza dny srpen", "e.g. Alza Days August", "напр. Alza Days серпень"],
  "objem stráca prioritu a čaká na nasledujúci zvoz – práca nezmizla, len sa posunula":
    ["objem ztrácí prioritu a čeká na následující svoz – práce nezmizela, jen se přesunula",
     "volume loses priority and waits for the next dispatch – the work has not disappeared, only moved",
     "обсяг втрачає пріоритет і чекає наступного відвантаження – робота не зникла, лише перемістилася"],
  "Odomknuté – zmeny výkonov sú povolené.": ["Odemčeno – změny výkonů jsou povoleny.", "Unlocked – rate changes are allowed.", "Розблоковано – зміни норм дозволені."],
  "Zamknuté.": ["Zamčeno.", "Locked.", "Заблоковано."],
  "Overenie zlyhalo.": ["Ověření selhalo.", "Verification failed.", "Помилка перевірки."],
  "Uložené len lokálne (bez pripojenia).": ["Uloženo jen lokálně (bez připojení).", "Saved locally only (offline).", "Збережено лише локально (без з'єднання)."],
  // --- tretí priechod: fragmenty kariet, legendy, stavy -------------------
  "model očakával": ["model očekával", "model expected", "модель очікувала"],
  "odchýlka": ["odchylka", "deviation", "відхилення"],
  "Očakávané (spätne)": ["Očekávané (zpětně)", "Expected (retrospective)", "Очікуване (ретроспективно)"],
  "na": ["na", "for", "на"],
  "80 % interval": ["80 % interval", "80 % interval", "80 % інтервал"],
  "zohľadňuje skutočnosť posledných dní (korekcia)": ["zohledňuje skutečnost posledních dní (korekce)", "reflects recent actuals (correction)", "враховує факт останніх днів (корекція)"],
  "deň v mesiaci": ["den v měsíci", "day of month", "день місяця"],
  "trend": ["trend", "trend", "тренд"],
  "/deň, tlmený": ["/den, tlumený", "/day, damped", "/день, згасаючий"],
  "bežný deň": ["běžný den", "regular day", "звичайний день"],
  "deň s udalosťou": ["den s událostí", "day with an event", "день з подією"],
  "skutočnosť": ["skutečnost", "actual", "факт"],
  "model": ["model", "model", "модель"],
  "predikcia": ["predikce", "forecast", "прогноз"],
  "predikcia deň vopred": ["predikce den dopředu", "day-ahead forecast", "прогноз на день уперед"],
  "Predikcia zvozov": ["Predikce svozů", "Dispatch forecast", "Прогноз відвантажень"],
  "vrátane": ["včetně", "including", "включно з"],
  "preneseného backlogu": ["přeneseného backlogu", "of transferred backlog", "перенесеного беклогу"],
  "Distribúcia (medzisklad)": ["Distribuce (mezisklad)", "Distribution (inter-warehouse)", "Дистрибуція (міжсклад)"],
  "práca mimo zákazníckych zvozov": ["práce mimo zákaznické svozy", "work outside customer dispatches", "робота поза клієнтськими відвантаженнями"],
  "Z vznikov": ["Z vzniků", "From orders created", "Зі створених"],
  "v deň zvozu": ["v den svozu", "on dispatch day", "у день відвантаження"],
  "deň s preneseným backlogom": ["den s přeneseným backlogem", "day with transferred backlog", "день з перенесеним беклогом"],
  "Vzniknuté do": ["Vzniklé do", "Created up to", "Створено до"],
  "porovnávacie dni do tejto hodiny": ["porovnávací dny do této hodiny", "reference days by this hour", "порівняльні дні до цієї години"],
  "dňa": ["dne", "of the day", "дня"],
  "rozpätie": ["rozpětí", "range", "діапазон"],
  "modelová predikcia dňa": ["modelová predikce dne", "model forecast for the day", "модельний прогноз дня"],
  "projekcia z porovnávacích dní": ["projekce z porovnávacích dní", "projection from reference days", "проєкція з порівняльних днів"],
  "dnešný zadaný stav": ["dnešní zadaný stav", "today's entered progress", "сьогоднішній введений стан"],
  "Postihnuté hodiny (voliteľné – nič neoznačené = celý deň):": ["Zasažené hodiny (volitelné – nic neoznačené = celý den):", "Affected hours (optional – none selected = whole day):", "Уражені години (необов'язково – нічого не вибрано = весь день):"],
  "oproti čistému očakávaniu": ["oproti čistému očekávání", "against the clean expectation", "проти чистого очікування"],
  "osôb-zmien navyše (11 h čistého času)": ["osobo-směn navíc (11 h čistého času)", "extra person-shifts (11 h net time)", "додаткових людино-змін (11 год чистого часу)"],
  "chýba výkon": ["chybí výkon", "rate missing", "бракує норми"],
  "Presun na najbližšie zvozy": ["Přesun na nejbližší svozy", "Transfer to next dispatches", "Перенесення на найближчі відвантаження"],
  "Už prenesené – zrušiť sa dá v zozname nižšie": ["Už přeneseno – zrušit lze v seznamu níže", "Already transferred – can be undone in the list below", "Уже перенесено – скасувати можна у списку нижче"],
  "týždeň od": ["týden od", "week of", "тиждень від"],
  "odomknuté": ["odemčeno", "unlocked", "розблоковано"],
  "Zmeny výkonov sú povolené v tejto relácii.": ["Změny výkonů jsou povoleny v této relaci.", "Rate changes are allowed in this session.", "Зміни норм дозволені в цій сесії."],
  "Chránené nastavenie": ["Chráněné nastavení", "Protected setting", "Захищене налаштування"],
  "Overujem…": ["Ověřuji…", "Verifying…", "Перевіряю…"],
  "Odomknúť": ["Odemknout", "Unlock", "Розблокувати"],
  "zadaj": ["zadej", "enter", "введи"],
  "zamknuté": ["zamčeno", "locked", "заблоковано"],
  "neuložené zmeny": ["neuložené změny", "unsaved changes", "незбережені зміни"],
  "Zmena výkonov je chránená – odomkni v záložke Výkony.": ["Změna výkonů je chráněná – odemkni v záložce Výkony.", "Rate changes are protected – unlock in the Rates tab.", "Зміна норм захищена – розблокуй у вкладці «Продуктивність»."],
  "Spracúvam…": ["Zpracovávám…", "Processing…", "Обробляю…"],
  "Vybrať Excel súbory": ["Vybrat Excel soubory", "Choose Excel files", "Вибрати файли Excel"],
  "Faktor dňa v týždni (8 týždňov)": ["Faktor dne v týdnu (8 týdnů)", "Day-of-week factor (8 weeks)", "Фактор дня тижня (8 тижнів)"],
  "Faktor dňa v mesiaci (výplatné výkyvy)": ["Faktor dne v měsíci (výplatní výkyvy)", "Day-of-month factor (payday swings)", "Фактор дня місяця (коливання зарплат)"],
  "Hodinový profil (podiel dňa, 6 týždňov)": ["Hodinový profil (podíl dne, 6 týdnů)", "Hourly profile (share of day, 6 weeks)", "Погодинний профіль (частка дня, 6 тижнів)"],
  "pracovný deň": ["pracovní den", "weekday", "робочий день"],
  "víkend": ["víkend", "weekend", "вихідні"],
  "testovaných dní": ["testovaných dní", "days tested", "перевірених днів"],
  "Načítavam dáta…": ["Načítám data…", "Loading data…", "Завантажую дані…"],
  "Uložené len lokálne.": ["Uloženo jen lokálně.", "Saved locally only.", "Збережено лише локально."],
  "Rovnaký deň v týždni (4×)": ["Stejný den v týdnu (4×)", "Same weekday (4×)", "Той самий день тижня (4×)"],
  "Posledných 14 dní": ["Posledních 14 dní", "Last 14 days", "Останні 14 днів"],
  "Konkrétny deň": ["Konkrétní den", "Specific day", "Конкретний день"],
};

const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const MAPA = new Map(Object.entries(S).map(([k, v]) => [norm(k), v]));

let LANG = "sk";
export function setLang(l) { LANG = l; }
export function getLang() { return LANG; }

export function t(text) {
  if (LANG === "sk" || typeof text !== "string") return text;
  const i = { cs: 0, en: 1, uk: 2 }[LANG];
  const zaznam = MAPA.get(norm(text));
  return zaznam && zaznam[i] ? zaznam[i] : text;
}
