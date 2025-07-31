document.addEventListener('DOMContentLoaded', () => {
    // Element referansları
    const tabloBaslik = document.getElementById('rapor-tablo-baslik');
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const raporBaslik = document.getElementById('rapor-baslik');
    const excelBtn = document.getElementById('excel-aktar-btn');
    const pdfBtn = document.getElementById('pdf-kaydet-btn');

    // Butonlara tıklama olaylarını en başta ata
    excelBtn.addEventListener('click', exportTableToExcel);
    pdfBtn.addEventListener('click', exportPageToPdf);

    // URL'den parametreleri al
    const params = new URLSearchParams(window.location.search);
    const raporTuru = params.get('rapor');
    const baslangic = params.get('baslangic');
    const bitis = params.get('bitis');

    if (!baslangic || !bitis || !raporTuru) {
        raporBaslik.textContent = "Hata";
        tabloGovdesi.innerHTML = '<tr><td colspan="5">Geçerli parametreler bulunamadı.</td></tr>';
        return;
    }

    // Rapor türüne göre doğru API'yi çağır
    const apiUrl = raporTuru === 'departman'
        ? `/api/data/aralik-raporu?baslangic=${baslangic}&bitis=${bitis}`
        : `/api/data/aralik-detaylari?baslangic=${baslangic}&bitis=${bitis}`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (raporTuru === 'gec') {
                renderGecGelenlerRaporu(data, baslangic, bitis);
            } else if (raporTuru === 'mesai') {
                renderFazlaMesaiRaporu(data, baslangic, bitis);
            } else if (raporTuru === 'departman') {
                renderDepartmanRaporu(data.departmanOzetleri, baslangic, bitis);
            } else if (raporTuru === 'erken') {
                renderErkenCikanlarRaporu(data, baslangic, bitis);
            } else {
                throw new Error("Bilinmeyen rapor türü.");
            }
        })
        .catch(error => {
            console.error('Rapor oluşturulurken hata:', error);
            tabloGovdesi.innerHTML = '<tr><td colspan="5">Rapor oluşturulurken bir hata oluştu.</td></tr>';
        });
});


// === EKSİK OLAN VE HATAYA NEDEN OLAN FONKSİYON ===
/**
 * Erken çıkanlar raporunu oluşturur.
 */
function renderErkenCikanlarRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Erken Çıkan Personel Raporu (${formatliBaslangic} - ${formatliBitis})`;

    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>Ad Soyad</th>
            <th>Departman</th>
            <th>Çıkış Saati</th>
            <th>Erken Çıkış Süresi</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const erkenCikanlar = data.filter(p => {
        const cikisSaati = new Date(p.SonCikis || p.sonCikis);
        if (!cikisSaati) return false;
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        return cikisSaati < hedefCikis;
    });

    tabloGovdesi.innerHTML = '';
    if (erkenCikanlar.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="5">Bu aralıkta erken çıkan personel bulunamadı.</td></tr>';
        return;
    }

    erkenCikanlar.sort((a, b) => new Date(a.SonCikis || a.sonCikis) - new Date(b.SonCikis || b.sonCikis));

    erkenCikanlar.forEach(p => {
        const tr = document.createElement('tr');
        const cikisSaati = new Date(p.SonCikis || p.sonCikis);
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        const erkenCikisDakika = Math.floor((hedefCikis - cikisSaati) / 60000);

        tr.innerHTML = `
            <td>${new Date(p.Tarih || p.tarih).toLocaleDateString('tr-TR')}</td>
            <td>${p.Ad || p.ad} ${p.Soyad || p.soyad}</td>
            <td>${p.Departman || p.departman || 'N/A'}</td>
            <td>${cikisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${erkenCikisDakika} dk</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}


// === DİĞER RENDER FONKSİYONLARI ===

function renderDepartmanRaporu(departmanOzetleri, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Departman Analiz Raporu (${formatliBaslangic} - ${formatliBitis})`;
    document.getElementById('rapor-tablo-baslik').innerHTML = `<tr><th>Departman</th><th>Kişi Sayısı</th><th>Ortalama Giriş Saati</th><th>Ortalama Çıkış Saati</th></tr>`;
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    tabloGovdesi.innerHTML = '';
    if (!departmanOzetleri || departmanOzetleri.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="4">Bu aralıkta analiz edilecek veri bulunamadı.</td></tr>';
        return;
    }
    departmanOzetleri.forEach(dep => {
        const tr = document.createElement('tr');
        const ortGiris = dep.ortalamaGiris.substring(0, 5);
        const ortCikis = dep.ortalamaCikis.substring(0, 5);
        tr.innerHTML = `<td>${dep.departman}</td><td>${dep.kisiSayisi}</td><td>${ortGiris}</td><td>${ortCikis}</td>`;
        tabloGovdesi.appendChild(tr);
    });
}

function renderGecGelenlerRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Geç Gelen Personel Raporu (${formatliBaslangic} - ${formatliBitis})`;
    document.getElementById('rapor-tablo-baslik').innerHTML = `<tr><th>Tarih</th><th>Ad Soyad</th><th>Departman</th><th>Giriş Saati</th><th>Gecikme Süresi</th></tr>`;
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const gecGelenler = data.filter(p => new Date(p.IlkGiris || p.ilkGiris) > new Date(new Date(p.IlkGiris || p.ilkGiris).setHours(8, 45, 0)));
    tabloGovdesi.innerHTML = '';
    if (gecGelenler.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="5">Bu aralıkta geç gelen personel bulunamadı.</td></tr>';
        return;
    }
    gecGelenler.forEach(p => {
        const tr = document.createElement('tr');
        const girisSaati = new Date(p.IlkGiris || p.ilkGiris);
        const hedefSaat = new Date(girisSaati).setHours(8, 45, 0);
        const gecikmeDakikasi = Math.floor((girisSaati - hedefSaat) / 60000);
        if (girisSaati > new Date(girisSaati).setHours(9, 0, 0)) {
            tr.classList.add('kritik-gecikme');
        }
        tr.innerHTML = `<td>${new Date(p.Tarih || p.tarih).toLocaleDateString('tr-TR')}</td><td>${p.Ad || p.ad} ${p.Soyad || p.soyad}</td><td>${p.Departman || p.departman || 'N/A'}</td><td>${girisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td><td>${gecikmeDakikasi} dk</td>`;
        tabloGovdesi.appendChild(tr);
    });
}

function renderFazlaMesaiRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Fazla Mesai Raporu (${formatliBaslangic} - ${formatliBitis})`;
    document.getElementById('rapor-tablo-baslik').innerHTML = `<tr><th>Tarih</th><th>Ad Soyad</th><th>Departman</th><th>Çıkış Saati</th><th>Fazla Mesai Süresi</th></tr>`;
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const mesaiYapanlar = data.filter(p => {
        const cikisSaati = new Date(p.SonCikis || p.sonCikis);
        if (!cikisSaati) return false;
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        return cikisSaati > hedefCikis;
    });
    tabloGovdesi.innerHTML = '';
    if (mesaiYapanlar.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="5">Bu aralıkta fazla mesai yapan personel bulunamadı.</td></tr>';
        return;
    }
    mesaiYapanlar.forEach(p => {
        const tr = document.createElement('tr');
        const cikisSaati = new Date(p.SonCikis || p.sonCikis);
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        const mesaiDakika = Math.floor((cikisSaati - hedefCikis) / 60000);
        if (mesaiDakika > 30) {
            tr.classList.add('onemli-mesai');
        }
        const saat = Math.floor(mesaiDakika / 60);
        const dakika = mesaiDakika % 60;
        let mesaiSuresi = '';
        if (saat > 0) mesaiSuresi += `${saat} saat `;
        if (dakika > 0) mesaiSuresi += `${dakika} dakika`;
        tr.innerHTML = `<td>${new Date(p.Tarih || p.tarih).toLocaleDateString('tr-TR')}</td><td>${p.Ad || p.ad} ${p.Soyad || p.soyad}</td><td>${p.Departman || p.departman || 'N/A'}</td><td>${cikisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td><td>+${mesaiSuresi.trim()}</td>`;
        tabloGovdesi.appendChild(tr);
    });
}


// === DIŞA AKTARMA FONKSİYONLARI ===
function exportTableToExcel() {
    const table = document.getElementById("rapor-tablosu");
    if (!table) {
        alert("Aktarılacak tablo bulunamadı!");
        return;
    }
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Rapor" });
    const raporBaslik = document.getElementById('rapor-baslik').textContent;
    XLSX.writeFile(workbook, `${raporBaslik}.xlsx`);
}

function exportPageToPdf() {
    const raporBaslik = document.getElementById('rapor-baslik').textContent;
    const element = document.querySelector(".container");
    const opt = {
        margin: 1,
        filename: `${raporBaslik}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
}