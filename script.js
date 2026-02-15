let capitalChart;
let savingsChart;

function visaMeddelande() {
    alert("Du klickade på knappen!");
}

function showPage(pageId) {
    // Dölj alla sidor
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    const activePage = document.getElementById('page-' + pageId);
    
    if (pageId === 'kalkylator') {
        // För kalkylatorn vill vi ha Flex (sidebar + grafer bredvid varandra)
        activePage.style.display = 'flex';
    } else {
        // För "Så har vi räknat" räcker det med Block (centrerat innehåll)
        activePage.style.display = 'block';
    }
}

function calculate() {
    // --- 1. Hämta Grundparametrar ---
    const ar = parseInt(document.getElementById('antalAr').value) || 0;
    const pris = parseFloat(document.getElementById('bostadspris').value) || 0;
    const rantaProcent = parseFloat(document.getElementById('ranta').value) / 100;
    const bostadsTillvaxt = parseFloat(document.getElementById('utveckling').value) / 100;
    const stockReturn = parseFloat(document.getElementById('stockReturn').value) / 100;
    const inflation = parseFloat(document.getElementById('inflation').value) / 100;
    const hyreOkning = parseFloat(document.getElementById('hyreOkning').value) / 100;
    const iskSkatt = parseFloat(document.getElementById('iskSkatt').value) / 100;
    const transaktionsKostnader = parseFloat(document.getElementById('transaktionsKostnader').value) || 0;
    const maklarArvode = parseFloat(document.getElementById('maklare').value) / 100;
    const kapitalVinstSkatt = parseFloat(document.getElementById('kapitalVinstSkatt').value) / 100;
    const okningSpar = parseFloat(document.getElementById('okningSpar').value) / 100;

    // --- 2. Inkomster och Budgetutgifter ---
    const inkomst = parseFloat(document.getElementById('budgetInkomst').value) || 0;
    const budgetIds = [
        'budgetMat', 'budgetNoje', 'budgetHygien', 'budgetKlader', 
        'budgetForbruk', 'budgetHemutr', 'budgetResor', 'budgetMobilochNätverk', 
        'budgetStream', 'budgetGym', 'budgetFack', 'budgetCsn', 'budgetAnnat', 'budgetVarmeOchEl'
    ];
    
    let initialaBudgetUtgifter = 0;
    budgetIds.forEach(id => {
        initialaBudgetUtgifter += parseFloat(document.getElementById(id).value) || 0;
    });

    // --- 3. Initiala värden (År 0) ---
    const kontantinsatsProcent = parseFloat(document.getElementById('kontantinsats').value) / 100;
    const startKapital = parseFloat(document.getElementById('startKapital').value) || 0;
    const insatsKr = pris * kontantinsatsProcent;
    
    let nuvarandeBostadsPris = pris;
    let lan = pris - insatsKr;
    let bostadsForsaljningsKostnaderOchSkatt = maklarArvode*(nuvarandeBostadsPris) + transaktionsKostnader + kapitalVinstSkatt*(nuvarandeBostadsPris-pris);
    
    // Kapital vid År 0
    let kapitalHyra = startKapital; 
    let kapitalKopaBorsen = startKapital - insatsKr;
    let totaltKopa = (nuvarandeBostadsPris - lan) - bostadsForsaljningsKostnaderOchSkatt + kapitalKopaBorsen;

    const hyraStart = parseFloat(document.getElementById('hyra').value) || 0;
    const avgiftStart = parseFloat(document.getElementById('avgift').value) || 0;
    

    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ""; 

    // --- 4. Rendera År 0 ---
    appendRow(0, 0, 0, totaltKopa, kapitalHyra);

    // listor för att skapa grafer.
    let labels = [];
    let dataCapitalBuy = [];
    let dataCapitalRent = [];
    let dataSavingsBuy = [];
    let dataSavingsRent = [];

    // --- 5. Simulation Loop (År 1 till n) ---
    for (let i = 1; i <= ar; i++) {
        
        // Kostnader detta år (inflationsjusterade från föregående år)
        // Vi använder (i-1) för att kostnaden under år 1 baseras på ingångsvärdena
        let nuvarandeHyra = hyraStart * Math.pow(1 + hyreOkning, i - 1);
        let nuvarandeAvgift = avgiftStart * Math.pow(1 + inflation, i - 1);
        let nuvarandeBudget = initialaBudgetUtgifter * Math.pow(1 + inflation, i - 1);
        let inkomstAr = inkomst * Math.pow(1 + okningSpar, i - 1);
        let arslonBrutto = (inkomstAr / 0.7) * 12; // Grov uppskattning av bruttolön för skuldkvot

        // --- AMORTERINGSBERÄKNING ---
        let belaningsgrad = lan / nuvarandeBostadsPris;
        let skuldkvot = lan / arslonBrutto;
        
        let amorteringProcent = 0;
        if (belaningsgrad > 0.70) amorteringProcent += 0.02;
        else if (belaningsgrad > 0.50) amorteringProcent += 0.01;
        
        if (skuldkvot > 4.5) amorteringProcent += 0.01;

        let amorteringAr = lan * amorteringProcent;
        let amorteringManad = amorteringAr / 12;
        
        // 1. Beräkna den totala bruttoräntan för året
        let bruttoRantaAr = lan * rantaProcent;
        // 2. Beräkna ränteavdraget enligt svenska regler:
        // 30% upp till 100 000 kr, 21% på resten.
        let ranteAvdrag;
        if (bruttoRantaAr <= 100000) {
            ranteAvdrag = bruttoRantaAr * 0.30;
        } else {
        // 30% på de första 100k + 21% på det som överstiger 100k
        ranteAvdrag = (100000 * 0.30) + ((bruttoRantaAr - 100000) * 0.21);
        }

        // 3. Den faktiska räntekostnaden per månad efter skattereduktion
        let ranteKostnadManadEfterAvdrag = (bruttoRantaAr - ranteAvdrag) / 12;

        // Månadssparande
        let sparaManadHyra = inkomstAr - nuvarandeHyra - nuvarandeBudget;
        let sparaManadKopa = inkomstAr - nuvarandeAvgift - ranteKostnadManadEfterAvdrag - amorteringManad - nuvarandeBudget;


        // Avkastning på börsen (efter skatt) + nysparande
        kapitalHyra = (kapitalHyra) * (1 + stockReturn - iskSkatt) + (sparaManadHyra * 12);
        kapitalKopaBorsen = (kapitalKopaBorsen ) * (1 + stockReturn - iskSkatt) + (sparaManadKopa * 12);
        
        // Lånet minskar med årets amortering
        lan -= amorteringAr; 
        if (lan < 0) lan = 0;

        // Bostadens värdeökning
        nuvarandeBostadsPris *= (1 + bostadsTillvaxt);
        bostadsForsaljningsKostnaderOchSkatt = maklarArvode*(nuvarandeBostadsPris) + transaktionsKostnader + kapitalVinstSkatt*(nuvarandeBostadsPris-pris);
        totaltKopa = (nuvarandeBostadsPris - lan) - bostadsForsaljningsKostnaderOchSkatt  + kapitalKopaBorsen;

        appendRow(i, sparaManadKopa, sparaManadHyra, totaltKopa, kapitalHyra);

        if (i === ar) {
            document.getElementById('final-buy').innerText = formatMoney(totaltKopa);
            document.getElementById('final-rent').innerText = formatMoney(kapitalHyra);
        }

        labels.push("År " + i);
        dataCapitalBuy.push(totaltKopa);
        dataCapitalRent.push(kapitalHyra);
        dataSavingsBuy.push(sparaManadKopa);
        dataSavingsRent.push(sparaManadHyra);
    }

    // EFTER LOOPEN - Rita/Uppdatera graferna
    updateCharts(labels, dataCapitalBuy, dataCapitalRent, dataSavingsBuy, dataSavingsRent);

    function updateCharts(labels, capBuy, capRent, savBuy, savRent) {
        const ctxCap = document.getElementById('capitalChart').getContext('2d');
        const ctxSav = document.getElementById('savingsChart').getContext('2d');

        // Radera gamla grafer om de finns (viktigt för att undvika "flimmer")
        if (capitalChart) capitalChart.destroy();
        if (savingsChart) savingsChart.destroy();

        // Graf 1: Totalt Kapital
        capitalChart = new Chart(ctxCap, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Totalt Kapital (Köpa)', data: capBuy, borderColor: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.1)', fill: true },
                    { label: 'Totalt Kapital (Hyra)', data: capRent, borderColor: '#1565c0', backgroundColor: 'rgba(21, 101, 192, 0.1)', fill: true }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Ackumulerat Kapital över tid' } } }
        });

        // Graf 2: Månadssparande
        savingsChart = new Chart(ctxSav, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Månadssparande (Köpa)', data: savBuy, backgroundColor: '#2e7d32' },
                    { label: 'Månadssparande (Hyra)', data: savRent, backgroundColor: '#1565c0' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Utveckling av Månadssparande' } } }
        });
    }

    // Hjälpfunktion för att lägga till rader
    function appendRow(year, sparKopa, sparHyra, kopa, hyra) {
        const row = `<tr>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">
                ${year === 0 ? '0' : year}
            </td>

            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: #666;">
                ${year === 0 ? '—' : formatMoney(sparKopa)}
            </td>

            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: #666;">
                ${year === 0 ? '—' : formatMoney(sparHyra)}
            </td>

            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">
                ${formatMoney(kopa)}
            </td>

            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">
                ${formatMoney(hyra)}
            </td>
        </tr>`;

        tableBody.innerHTML += row;
    }
}

function formatMoney(val) {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(val);
}

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', calculate);
});

window.onload = calculate;
