//===================================================================
//Muhammed Furkan Atak
//furkanatak.work@gmail.com
//05362058576
//tarih : 08/25/25
//===================================================================

const personelInfoIcerik = document.getElementById('personel-info-icerik');
const personelListesi = document.getElementById('personelListesi');

const adFiltreInput = document.getElementById('adFiltre');
const firmaFiltre = document.getElementById('firmaFiltre');
const altfirmaFiltre = document.getElementById('altfirmaFiltre');
const departmanFiltre = document.getElementById('departmanFiltre');
document.addEventListener('DOMContentLoaded', initializePage);
adFiltreInput.addEventListener('input', debounce(applyFilters, 300));
const firmaFiltreSelect = document.getElementById('firmaFiltre');


const modalBody = document.getElementById('modal-body-content');
let aktifGrafikVerisi = [];
let guncelGrafikVerisi = []; 
const kisiDetayBaslik = document.getElementById('kisiDetayBaslik');
const barChartContainer = document.getElementById('barChartContainer');
const donutChartContainer = document.getElementById('donutChartContainer');
const gunlukDetayKutusu = document.getElementById('gunlukDetay');
const gunSeciciSelect = document.getElementById('gunSecici');

firmaFiltreSelect.addEventListener('change', applyFilters);
Chart.register(ChartDataLabels);

let currentPersonApiData = [];
let mesaiChart = null;
let durumChart = null;
let allPersonnel = [];




//mesai ve donut grafiğinin renk ayarları

const CHART_COLORS = {
    normal: 'rgba(40, 167, 69, 0.7)',
    eksik: 'rgba(220, 53, 69, 0.7)',    
    fazla: 'rgba(13, 110, 253, 0.7)',   
    izin: 'rgba(13, 202, 240, 0.3)',    
    normal_border: 'rgba(40, 167, 69, 1)',
    eksik_border: 'rgba(220, 53, 69, 1)',
    fazla_border: 'rgba(13, 110, 253, 1)',
};


const grafikBaslangicInput = document.getElementById('grafikBaslangic');
const grafikBitisInput = document.getElementById('grafikBitis');
const eksikMesaiFiltre = document.getElementById('eksikMesaiFiltre');
const grafikOzetKutusu = document.getElementById('grafik-ozet-kutusu');



function resetFilters(seviye) {
    if (seviye === 'altfirma' || seviye === 'departman') {
        altfirmaFiltre.innerHTML = '<option value="">Tüm Alt Firmalar</option>';
        altfirmaFiltre.disabled = true;
    }
    if (seviye === 'departman') {
        departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
        departmanFiltre.disabled = true;
    }
}


function initializeFilters() {
    const firmalar = [...new Map(allPersonnel.map(p => [p.firma, { ad: p.firma }])).values()]
        .map(p => p.ad) 
        .sort((a, b) => a.localeCompare(b)); 

    populateSelect(firmaFiltre, firmalar, "Firma Seçiniz...");

    altfirmaFiltre.innerHTML = '<option value="">Tüm Alt Firmalar</option>';
    altfirmaFiltre.disabled = true;
    departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departmanFiltre.disabled = true;
}

/**
 * @param {HTMLSelectElement} selectElement
 * @param {string[]} data
 * @param {string} defaultText 
 */
function populateSelect(selectElement, data, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    data.forEach(item => {
        const temizItem = item.trim();
        selectElement.add(new Option(temizItem, temizItem));
    });
}


function firmaSecildi() {
    const seciliFirma = firmaFiltre.value;

    altfirmaFiltre.innerHTML = '<option value="">Tüm Alt Firmalar</option>';
    altfirmaFiltre.disabled = true;
    departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departmanFiltre.disabled = true;

    if (!seciliFirma) {
        applyFilters(); 
        return;
    }

    const firmaPersonelleri = allPersonnel.filter(p => p.firma === seciliFirma);

    const altFirmalar = [...new Set(firmaPersonelleri.map(p => p.altFirma).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    if (altFirmalar.length > 0) {
        populateSelect(altfirmaFiltre, altFirmalar, "Tüm Alt Firmalar");
        altfirmaFiltre.disabled = false;
    }

    const departmanlar = [...new Set(firmaPersonelleri.map(p => p.departman).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    if (departmanlar.length > 0) {
        populateSelect(departmanFiltre, departmanlar, "Tüm Departmanlar");
        departmanFiltre.disabled = false;
    }

    // Seçim yapıldığında ana listeyi filtrele
    applyFilters();
}


function altFirmaSecildi() {
    const seciliFirma = firmaFiltre.value;
    const seciliAltFirma = altfirmaFiltre.value;

    departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departmanFiltre.disabled = true;

    if (!seciliFirma) {
        applyFilters();
        return;
    }

    let ilgiliPersoneller = allPersonnel.filter(p => p.firma === seciliFirma);

    // Eğer bir alt firma seçildiyse, personel listesini ona göre de daralt
    if (seciliAltFirma) {
        ilgiliPersoneller = ilgiliPersoneller.filter(p => p.altFirma === seciliAltFirma);
    }

    // Kalan personellere göre departmanları yeniden doldur
    const departmanlar = [...new Set(ilgiliPersoneller.map(p => p.departman).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    if (departmanlar.length > 0) {
        populateSelect(departmanFiltre, departmanlar, "Tüm Departmanlar");
        departmanFiltre.disabled = false;
    }

    // Seçim yapıldığında ana listeyi filtrele
    applyFilters();
}

function applyFilters() {
    personelListesi.style.opacity = '0.5';

    // Arama işlemini küçük bir gecikmeyle yaparak anlık geri bildirimin görünmesini sağla
    setTimeout(() => {
        const nameFilter = adFiltreInput.value.toLowerCase();
        const firmaFilter = firmaFiltre.value;
        const altFirmaFilter = altfirmaFiltre.value;
        const depFilter = departmanFiltre.value;
        let filteredList = allPersonnel;

        if (firmaFilter) filteredList = filteredList.filter(p => p.firma === firmaFilter);
        if (altFirmaFilter) filteredList = filteredList.filter(p => p.altFirma === altFirmaFilter);
        if (depFilter) filteredList = filteredList.filter(p => p.departman === depFilter);
        if (nameFilter) filteredList = filteredList.filter(p => `${p.ad} ${p.soyad}`.toLowerCase().includes(nameFilter));

        renderPersonnelList(filteredList);

        personelListesi.style.opacity = '1';

    }, 50); 
}














function generateOzetMetni(gec, erken, herIkisi, toplamGoruntulenen) {
    const metinParcalari = [];

    if (herIkisi > 0) {
        metinParcalari.push(`<div class="ozet-oge kirmizi"><strong>${herIkisi}</strong> gün hem geç gelindi hem erken çıkıldı</div>`);
    }
    if (gec > 0) {
        metinParcalari.push(`<div class="ozet-oge kirmizi"><strong>${gec}</strong> gün sadece geç gelindi</div>`);
    }
    if (erken > 0) {
        metinParcalari.push(`<div class="ozet-oge kirmizi"><strong>${erken}</strong> gün sadece erken çıkıldı</div>`);
    }

    if (metinParcalari.length === 0 && toplamGoruntulenen === 0) {
        return `<div class="ozet-oge">Seçili aralıkta görüntülenecek veri yok.</div>`;
    }

    metinParcalari.push(`<div class="ozet-oge"><strong>${toplamGoruntulenen}</strong> gün görüntülendi</div>`);

    return metinParcalari.join('');
}



function updateChartWithFilters() {
    const baslangic = new Date(grafikBaslangicInput.value);
    const bitis = new Date(grafikBitisInput.value);

    const tumIsGunleri = [];
    let gun = new Date(baslangic);
    while (gun <= bitis) {
        const dayOfWeek = gun.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
            tumIsGunleri.push(new Date(gun));
        }
        gun.setDate(gun.getDate() + 1);
    }

    const eksikFiltrele = eksikMesaiFiltre.checked;

    let eksikMesaiSayisi = 0;

    const labels = [];
    const chartData = []; 
    const leaveData = []; 
    const backgroundColors = [];
    let enGecCikisSaati = 18; 
    let enErkenGirisSaati = 8;  

    tumIsGunleri.forEach(takvimGunu => {
        const tarihString = takvimGunu.toISOString().split('T')[0];
        labels.push(takvimGunu.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }));

        const gunVerisi = aktifGrafikVerisi.find(d => (d.Tarih || d.tarih).startsWith(tarihString));

        if (gunVerisi) {
            const ilkGiris = new Date(gunVerisi.IlkGiris || gunVerisi.ilkGiris);
            const sonCikis = new Date(gunVerisi.SonCikis || gunVerisi.sonCikis);
            const toplamMesai = gunVerisi.ToplamMesaiDakika || gunVerisi.toplamMesaiDakika || 0;
            const isCalismaSuresiEksik = toplamMesai < 480;

            if (isCalismaSuresiEksik) {
                eksikMesaiSayisi++;
            }

            let barData = [ilkGiris.getHours() + ilkGiris.getMinutes() / 60, sonCikis.getHours() + sonCikis.getMinutes() / 60];

            if (eksikFiltrele && !isCalismaSuresiEksik) {
                barData = null;
            }

            chartData.push(barData);
            backgroundColors.push(isCalismaSuresiEksik ? CHART_COLORS.eksik : CHART_COLORS.normal);

            const cikisSaatiDecimal = sonCikis.getHours() + sonCikis.getMinutes() / 60;
            if (cikisSaatiDecimal > enGecCikisSaati) enGecCikisSaati = cikisSaatiDecimal;
            const girisSaatiDecimal = ilkGiris.getHours() + ilkGiris.getMinutes() / 60;
            if (girisSaatiDecimal < enErkenGirisSaati) enErkenGirisSaati = girisSaatiDecimal;

       
            const izinBas = gunVerisi.izinBasTarih
                ? new Date(String(gunVerisi.izinBasTarih).replace(" ", "T"))
                : null;

            const izinBit = gunVerisi.izinBitTarih
                ? new Date(String(gunVerisi.izinBitTarih).replace(" ", "T"))
                : null;

          

            if (izinBas && izinBit) {
                const izinBasSaat = izinBas.getHours() + izinBas.getMinutes() / 60;
                const izinBitSaat = izinBit.getHours() + izinBit.getMinutes() / 60;

                if (izinBas.getTime() === izinBit.getTime() || (izinBasSaat === 0 && izinBitSaat === 0)) {
                    leaveData.push([8.5, 17.5]);
                } else {
                    leaveData.push([izinBasSaat, izinBitSaat]);
                }
            } else {
                leaveData.push(null);
            }

        } else {
            chartData.push(null);
            leaveData.push(null); 
            backgroundColors.push('transparent');
        }
    });

    guncelGrafikVerisi = aktifGrafikVerisi.filter(d => {
        const tarih = new Date(d.Tarih || d.tarih);
        return tarih >= baslangic && tarih <= bitis;
    });

    grafikOzetKutusu.innerHTML = `
        <div class="ozet-oge kirmizi"><strong>${eksikMesaiSayisi}</strong> gün eksik mesai yapıldı</div>
        <div class="ozet-oge"><strong>${labels.length}</strong> iş günü görüntülendi</div>
    `;

    drawGanttChart(labels, chartData, backgroundColors, leaveData, enGecCikisSaati, enErkenGirisSaati);
}

function drawGanttChart(labels, chartData, backgroundColors, leaveData, enGecCikis, enErken) {
    if (mesaiChart) {
        mesaiChart.destroy();
    }
    const ctx = document.getElementById('mesaiChart').getContext('2d');

    if (!ctx) {
        console.error("Grafik çizilemedi: 'mesaiChart' ID'li canvas elementi bulunamadı.");
        return;
    }

    const yAxisMax = Math.max(18, Math.ceil(enGecCikis));
    const yAxisMin = Math.min(8, Math.floor(enErken));

    const formatla = (saat) => {
        const h = Math.floor(saat);
        const m = Math.round((saat - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    mesaiChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    
                    data: chartData,
                    backgroundColor: backgroundColors,
                    borderSkipped: false,
                    order: 2
                },
                {
                    label: 'İzin Aralığı',
                    data: leaveData,
                    backgroundColor: 'rgba(0, 123, 255, 0.4)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1,
                    borderSkipped: false,
                    order:1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Tarih' },
                    stacked: true,
                    grouped: false
                },
                y: {
                    min: yAxisMin,
                    max: yAxisMax,
                    ticks: {
                        stepSize: 1,
                        callback: function (value) {
                            if (Math.floor(value) === value) {
                                return value.toString().padStart(2, '0') + ':00';
                            }
                        }
                    },
                    title: { display: true, text: 'Saat' },
                    stacked: false
                }
            },
            plugins: {
                legend: {
                    display: false,
                },
                datalabels: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    position: 'nearest',  
                    yAlign: 'center',    
                    xAlign: 'auto',
                    callbacks: {
                        label: function (context) {
                            const val = context.raw;
                            if (!val) return '';

                            if (
                                context.dataset.label === 'İzin Aralığı'
                            ) {
                                return null;
                            }
                            const sureDecimal = val[1] - val[0];
                            const sureSaat = Math.floor(sureDecimal);
                            const sureDakika = Math.round((sureDecimal - sureSaat) * 60);

                            let calisilanSureMetni = '';
                            if (sureSaat > 0) calisilanSureMetni += `${sureSaat} saat `;
                            if (sureDakika > 0) calisilanSureMetni += `${sureDakika} dakika`;
                            calisilanSureMetni = calisilanSureMetni.trim() || '0 dakika';

                            return `Mesai: ${formatla(val[0])} - ${formatla(val[1])} (${calisilanSureMetni})`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        mesaiBaslangic: {
                            type: 'line',
                            yMin: 8.5,
                            yMax: 8.5,
                            borderColor: 'rgba(75, 192, 192, 0.8)',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                content: 'Mesai Başlangıcı (8:30)',
                                display: true,
                                position: 'end',
                                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                                color: 'white',
                                font: { weight: 'bold' }
                            }
                        },
                        mesaiBitis: {
                            type: 'line',
                            yMin: 17.5,
                            yMax: 17.5,
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                content: 'Mesai Bitişi (17:30)',
                                display: true,
                                position: 'end',
                                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                                color: 'white',
                                font: { weight: 'bold' }
                            }
                        }
                    }
                }
            }
        }
    });
}
function createAdvancedBarChart(apiData) {
    aktifGrafikVerisi = apiData; 
    const excelButonu = document.getElementById('grafik-excel-btn');
    excelButonu.addEventListener('click', exportChartDataToExcel);
   
    const bitisTarihi = new Date();
    const baslangicTarihi = new Date();
    baslangicTarihi.setDate(bitisTarihi.getDate() - 30);

    grafikBaslangicInput.value = baslangicTarihi.toISOString().split('T')[0];
    grafikBitisInput.value = bitisTarihi.toISOString().split('T')[0];

    grafikBaslangicInput.addEventListener('change', updateChartWithFilters);
    grafikBitisInput.addEventListener('change', updateChartWithFilters);
    eksikMesaiFiltre.addEventListener('change', updateChartWithFilters);


    updateChartWithFilters();
}


function populateGunSecici(tarihler) {
    gunSeciciSelect.innerHTML = '<option value="">Tarih Seçin...</option>';
    tarihler.forEach((tarih, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = tarih;
        gunSeciciSelect.appendChild(option);
    });
}


function handleGunSeciciChange() {
    const selectedIndex = parseInt(gunSeciciSelect.value);

    if (isNaN(selectedIndex)) {
        mesaiChart.setActiveElements([]);
        mesaiChart.update();
        return;
    }


    displayDailyDetails(currentPersonApiData[selectedIndex]);


    mesaiChart.setActiveElements([{ datasetIndex: 0, index: selectedIndex }]);
    mesaiChart.update();
}

function initializePage() {


    personelleriGetir();

}



function personelleriGetir() {
    fetch('/api/data/personeller')
        .then(response => response.json())
        .then(data => {
            allPersonnel = data.map(p => ({
                ...p,
                ad: p.ad || p.Ad,
                soyad: p.soyad || p.Soyad,
                departman: p.departman || p.Departman,
                firma: p.firma || p.Firma,
                altFirma: p.altFirma || p.AltFirma
            }));
            populateInitialFilters();
            applyFilters();


            const params = new URLSearchParams(window.location.search);
            const userIdFromUrl = params.get('UserID');




            if (userIdFromUrl) {
                const person = allPersonnel.find(p => (p.userID || p.UserID) == userIdFromUrl);
                const listItem = personelListesi.querySelector(`li[data-userid='${userIdFromUrl}']`);

                if (person && listItem) {
                    console.log(`URL'den gelen ${userIdFromUrl} ID'li kişi otomatik seçiliyor...`);
                    kisiSecildi(person.userID || person.UserID, `${person.ad} ${person.soyad}`, listItem);
                } else {
                    console.warn(`URL'de belirtilen UserID (${userIdFromUrl}) personel listesinde bulunamadı.`);
                }
            }
        })
        .catch(error => {
            console.error('Personel listesi alınırken hata:', error);
        });
}

adFiltreInput.addEventListener('input', applyFilters);
departmanFiltre.addEventListener('change', applyFilters);
firmaFiltre.addEventListener('change', firmaSecildi);
altfirmaFiltre.addEventListener('change', altFirmaSecildi);

personelleriGetir();



function clearFilters() {
    adFiltreInput.value = '';
    firmaFiltre.selectedIndex = 0;
    firmaFiltre.dispatchEvent(new Event('change'));
}

function populateInitialFilters() {
    const firmalar = [...new Set(allPersonnel.map(p => p.firma).filter(Boolean))];
    firmalar.sort();
    firmalar.forEach(firma => firmaFiltre.add(new Option(firma, firma)));
}

function populateFirmaFilter() {
    const firmalar = [...new Set(allPersonnel.map(p => p.firma).filter(Boolean))];
    firmalar.sort();

    firmaFiltreSelect.innerHTML = '<option value="">Tüm Firmalar</option>';
    firmalar.forEach(firma => {
        const option = document.createElement('option');
        option.value = firma;
        option.textContent = firma;
        firmaFiltreSelect.appendChild(option);
    });
}
function applyFilters() {
    const nameFilter = adFiltreInput.value.toLowerCase();
    const firmaFilter = firmaFiltre.value;
    const altFirmaFilter = altfirmaFiltre.value;
    const depFilter = departmanFiltre.value;

    let filteredList = allPersonnel;

    if (firmaFilter) filteredList = filteredList.filter(p => p.firma === firmaFilter);
    if (altFirmaFilter) filteredList = filteredList.filter(p => p.altFirma === altFirmaFilter);
    if (depFilter) filteredList = filteredList.filter(p => p.departman === depFilter);
    if (nameFilter) {
        filteredList = filteredList.filter(p =>
            `${p.ad} ${p.soyad}`.toLocaleLowerCase('tr-TR').includes(nameFilter)
        );
    }

    renderPersonnelList(filteredList);
}

function renderPersonnelList(personnel) {
    personelListesi.innerHTML = '';

    if (!personnel || personnel.length === 0) {
        personelListesi.innerHTML = '<li>Sonuç bulunamadı.</li>';
        return;
    }


    const placeholderImage = `
        <svg class="personel-foto" xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#6c757d" viewBox="0 0 16 16">
            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        </svg>`;

    personnel.forEach(p => {
        const li = document.createElement('li');
        const ad = p.ad || p.Ad || 'AdYok';
        const soyad = p.soyad || p.Soyad || 'SoyadYok';
        const userId = p.userID || p.UserID;
        const fotoBase64 = p.fotoBase64 || p.FotoBase64;
        li.dataset.userid = userId;

        let imageHtml = placeholderImage;
        if (fotoBase64) {

            imageHtml = `<img src="data:image/jpeg;base64,${fotoBase64}" alt="${ad} ${soyad}" class="personel-foto">`;
        }




        li.innerHTML = `${imageHtml} <span>${ad} ${soyad}</span>`;
        li.onclick = () => kisiSecildi(userId, `${ad} ${soyad}`, li);
        personelListesi.appendChild(li);
    });
}

function populateDepartmentFilter() {
    const departments = [...new Set(allPersonnel.map(p => p.departman || p.Departman).filter(Boolean))];
    departments.sort();
    departmanFiltreSelect.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departments.forEach(dep => {
        const option = document.createElement('option');
        option.value = dep;
        option.textContent = dep;
        departmanFiltreSelect.appendChild(option);
    });
}




function displayDailyDetails(secilenGun) {
    const tarih = new Date(secilenGun.Tarih || secilenGun.tarih);
    const ilkGiris = new Date(secilenGun.IlkGiris || secilenGun.ilkGiris);
    const sonCikis = new Date(secilenGun.SonCikis || secilenGun.sonCikis);
    const gecGirisSiniri = new Date(tarih).setHours(8, 30, 0);
    const erkenCikisSiniri = new Date(tarih).setHours(17, 10, 0);
    let durumMesaji = '';

    if (ilkGiris > gecGirisSiniri) durumMesaji += 'Geç geldi. ';
    if (sonCikis < erkenCikisSiniri) durumMesaji += 'Erken çıktı.';
    if (durumMesaji === '') durumMesaji = 'Mesai saatlerine uyulmuş.';
    const detayHTML = `
        <strong>Tarih:</strong> ${tarih.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
        <strong>İlk Giriş:</strong> ${ilkGiris.toLocaleTimeString('tr-TR')}<br>
        <strong>Son Çıkış:</strong> ${sonCikis.toLocaleTimeString('tr-TR')}<br>
        <strong>Durum:</strong> <span style="color: ${durumMesaji.includes('uyulmuş') ? 'green' : 'red'};">${durumMesaji}</span>
    `;
    gunlukDetayKutusu.innerHTML = detayHTML;
    gunlukDetayKutusu.scrollIntoView({ behavior: 'smooth', block: 'center' });
}




async function fetchAndDisplayPersonelInfo(userId) {
    personelInfoIcerik.innerHTML = '<i>Bilgiler yükleniyor...</i>';
    try {
        const response = await fetch(`/api/data/getinfo/${userId}`);
        if (!response.ok) throw new Error('Personel bilgileri API\'den alınamadı.');

        const infoDataArray = await response.json();
        if (!infoDataArray || infoDataArray.length === 0) throw new Error("Personel bilgisi boş geldi.");
        const infoData = infoDataArray[0];

        const personelNo = parseInt(infoData.personleNo) || 'N/A';

        const giris = infoData.giris?.substring(0, 10);

        const telefon = infoData.tel || 'N/A';
        const ad = infoData.ad;
        const departman = infoData.departman;

        const soyad = infoData.soyad;
        const fotoBase64 = infoData.foto || infoData.foto;

        const placeholderImage = `
        <svg class="personel-info-foto" xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#6c757d" viewBox="0 0 16 16">
            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        </svg>`;




        let imageHtml = placeholderImage;
        if (fotoBase64) {
            imageHtml = `<img src="data:image/jpeg;base64,${fotoBase64}" alt="${ad} ${soyad}" class="personel-info-foto">`;
        }

        userId = parseInt(userId);
        const infoHtml = `
          <div class="personel-info-content">
                    ${imageHtml}

          <p><strong>Ad:</strong> ${ad}</p>
            <p><strong>Soyad:</strong> ${soyad}</p>
            <p><strong>Personel No:</strong> ${personelNo}</p>
            <p><strong>Departman:</strong> ${departman}</p>
            <p><strong>İşe Giriş Tarihi:</strong> ${giris}</p>
            <p><strong>Telefon:</strong> ${telefon}</p>
            <a href="personel-detay.html?userId=${userId}" target="_blank" class="profil-goruntule-btn">Profili Görüntüle</a>

            </div>
        `;
        personelInfoIcerik.innerHTML = infoHtml;

    } catch (error) {
        console.error("Personel info alınırken hata:", error);
        personelInfoIcerik.innerHTML = '<span style="color: red;">Bilgiler yüklenemedi.</span>';
    }
}
const personelInfoKarti = document.getElementById('personel-info-karti');
const anaGrafikAlani = document.getElementById('anaGrafikAlani');
const chartsSectionContainer = document.getElementById('charts-section-container');

function kisiSecildi(userId, adSoyad, clickedListItem) {
    document.querySelectorAll('#personelListesi li').forEach(item => item.classList.remove('selected'));
    if (clickedListItem) clickedListItem.classList.add('selected');


    chartsSectionContainer.style.display = 'flex';
    fetchAndDisplayPersonelInfo(userId);

    kisiDetayBaslik.textContent = `${adSoyad} - Mesai Detayları`;

    kisiDetayBaslik.style.display = 'block';
    personelInfoKarti.style.display = 'flex';

    if (mesaiChart) mesaiChart.destroy();
    if (durumChart) durumChart.destroy();


    fetch(`/api/data/mesai/${userId}`)
        .then(response => response.json())
        .then(apiData => {
            currentPersonApiData = apiData;
            if (apiData.length === 0) {


                chartsSectionContainer.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!';
                personelInfoKarti.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!';
                return;
            }

            barChartContainer.style.display = 'block';
            donutChartContainer.style.display = 'block';

            const processedData = processChartData(apiData);

            createAdvancedBarChart(apiData); 
            createDoughnutChart(processChartData(apiData).donutData);

        })
        .catch(error => {
            console.error('Mesai detayı alınırken hata:', error);
        });





    kisiDetayBaslik.scrollIntoView({ behavior: 'smooth', block: 'center' });

}

/**
 * @param {Object} barData
 * @param {Array} apiData 
 */




function processChartData(apiData) {
    const barData = { tarihler: [], mesaiDakika: [], backgroundColors: [], borderColors: [] };
    const donutData = { tam_mesai: 0, sadece_eksik: 0 };

    apiData.forEach(gunlukVeri => {
        const tarih = new Date(gunlukVeri.Tarih || gunlukVeri.tarih);
        if (isNaN(tarih.getTime())) return;

        const ilkGiris = new Date(gunlukVeri.IlkGiris || gunlukVeri.ilkGiris);
        const sonCikis = new Date(gunlukVeri.SonCikis || gunlukVeri.sonCikis);

        const isGec = ilkGiris > new Date(tarih).setHours(9, 0, 0);
        const isErken = sonCikis < new Date(tarih).setHours(17, 0, 0);

        barData.tarihler.push(tarih.toLocaleDateString('tr-TR'));
        barData.mesaiDakika.push(gunlukVeri.ToplamMesaiDakika || gunlukVeri.toplamMesaiDakika);
        barData.borderColors.push((isGec || isErken) ? CHART_COLORS.eksik_border : CHART_COLORS.normal_border);

        const toplamMesai = gunlukVeri.ToplamMesaiDakika || gunlukVeri.toplamMesaiDakika || 0;

        const isCalismaSuresiEksik = toplamMesai < 480;

        if (isCalismaSuresiEksik) {
            donutData.sadece_eksik++;

        } else {
            donutData.tam_mesai++;
        }
    });
    return { barData, donutData };
}
function createDoughnutChart(donutData) {
    donutChartContainer.style.display = 'flex';
    const ctx = document.getElementById('durumChart').getContext('2d');

    const dataValues = [donutData.tam_mesai, donutData.sadece_eksik];
    const total = dataValues.reduce((acc, val) => acc + val, 0);

    const hemEksikColor = 'rgba(255, 159, 64, 0.7)'; 

    durumChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Tam Mesai Günü', 'Sadece Eksik Mesai'],
            datasets: [{
                data: dataValues,
                backgroundColor: [CHART_COLORS.normal, CHART_COLORS.eksik],
                borderColor: ['#fff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Mesai Durum Dağılımı'
                },
                datalabels: {
                    formatter: (value, context) => {
                        if (total === 0 || value === 0) return ''; 
                        const percentage = (value / total * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: 14,
                    }
                }
            }
        }
    });
}






const infoModal = document.getElementById('info-modal');
const photoLightbox = document.getElementById('photo-lightbox');
const lightboxImage = document.getElementById('lightbox-image');

personelInfoKarti.addEventListener('click', () => {
    const contentToCopy = personelInfoIcerik.innerHTML;
    if (contentToCopy && !contentToCopy.includes('<i>')) {
        modalBody.innerHTML = contentToCopy;
        openModal(infoModal);
    }
});



document.querySelectorAll('[data-close-modal]').forEach(item => {
    item.addEventListener('click', () => {
        closeAllModals();
    });
});


function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-visible');
    document.body.classList.add('modal-open');
}


function closeAllModals() {
    document.querySelectorAll('.modal.is-visible').forEach(modal => {
        modal.classList.remove('is-visible');
    });
    document.body.classList.remove('modal-open');
}





const grafikSekmeleriContainer = document.querySelector('.grafik-sekmeleri');
const grafikIcerikAlanlari = document.querySelectorAll('.grafik-icerik-alani');

grafikSekmeleriContainer.addEventListener('click', (event) => {
    const tiklananSekme = event.target.closest('.sekme-buton');
    if (!tiklananSekme) return;

    grafikSekmeleriContainer.querySelectorAll('.sekme-buton').forEach(btn => {
        btn.classList.remove('aktif');
    });
    tiklananSekme.classList.add('aktif');

    const grafikTuru = tiklananSekme.dataset.grafik;
    grafikIcerikAlanlari.forEach(alan => {
        if (alan.id === `grafik-${grafikTuru}`) {
            alan.classList.add('aktif');
        } else {
            alan.classList.remove('aktif');
        }
    });
});


const raporlarBtn = document.getElementById('raporlar-btn');
const raporlarDropdown = document.getElementById('raporlar-dropdown-icerik');

raporlarBtn.addEventListener('click', () => {
    raporlarDropdown.classList.toggle('show');
});

window.addEventListener('click', (event) => {
    
    if (!event.target.matches('#raporlar-btn, #raporlar-btn *')) {
       
        if (raporlarDropdown.classList.contains('show')) {
            raporlarDropdown.classList.remove('show');
        }
    }
});







/**
 * Bir fonksiyonun belirli bir süre içinde tekrar tekrar çalışmasını engeller (Debounce).
 * @param {Function} func - Çalıştırılacak fonksiyon.
 * @param {number} delay - Bekleme süresi (milisaniye).
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}


async function exportChartDataToExcel() {
    if (!guncelGrafikVerisi || guncelGrafikVerisi.length === 0) {
        alert("Aktarılacak veri bulunamadı.");
        return;
    }

    const adSoyad = document.getElementById('kisiDetayBaslik').textContent.replace(' - Mesai Detayları', '');
    const baslangic = document.getElementById('grafikBaslangic').value;
    const bitis = document.getElementById('grafikBitis').value;

    const ilkKayit = guncelGrafikVerisi[0];
    const sicilId = ilkKayit.SicilID || ilkKayit.sicilID || 'N/A';
    const personelNo = ilkKayit.PersonelNo || ilkKayit.personelNo || 'N/A';
    const cardId = ilkKayit.CardID || ilkKayit.cardID || 'N/A';
    const userId = ilkKayit.UserID || ilkKayit.userID || 'N/A';


    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mesai Detay Raporu');

    worksheet.addRow(["Personel Adı:", adSoyad]);
    worksheet.addRow(["Personel No:", personelNo, "", "Sicil ID:", sicilId]);
    worksheet.addRow(["UserID:", userId, "", "Card ID:", cardId]);
    worksheet.addRow(["Rapor Tarih Aralığı:", `${baslangic} - ${bitis}`]);
    worksheet.addRow([]); 

    worksheet.mergeCells('B1:E1');
    worksheet.mergeCells('B2:C2'); worksheet.mergeCells('E2:F2');
    worksheet.mergeCells('B3:C3'); worksheet.mergeCells('E3:F3');
    worksheet.mergeCells('B4:E4');

    [1, 2, 3, 4].forEach(i => {
        worksheet.getRow(i).font = { bold: true, size: 12 };
    });
    const sutunBasliklari = ['Tarih', 'İlk Giriş', 'Son Çıkış', 'Toplam Süre', 'Durum'];
    const headerRow = worksheet.addRow(sutunBasliklari);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF495057' } 
        };
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
        };
    });

    guncelGrafikVerisi.forEach(d => {
        const tarih = new Date(d.Tarih || d.tarih);
        const ilkGiris = new Date(d.IlkGiris || d.ilkGiris);
        const sonCikis = new Date(d.SonCikis || d.sonCikis);
        const toplamMesai = d.ToplamMesaiDakika || d.toplamMesaiDakika || 0;

        const isEksik = toplamMesai < 480;
        const saat = Math.floor(toplamMesai / 60);
        const dakika = toplamMesai % 60;

        const rowData = [
            tarih.toLocaleDateString('tr-TR'),
            ilkGiris.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            sonCikis.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            `${saat} saat ${dakika} dk`,
            isEksik ? 'Eksik Mesai' : 'Tamamlandı'
        ];

        const row = worksheet.addRow(rowData);

        if (isEksik) {
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFEBEE' } 
                };
                cell.font = {
                    color: { argb: 'FF9C0006' } 
                }
            });
        }
    });

    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 15;

    workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer]), `${adSoyad} Mesai Raporu.xlsx`);
    });
}









