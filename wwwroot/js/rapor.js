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
            }
        })
        .catch(error => {
            console.error('Rapor oluşturulurken hata:', error);
            tabloGovdesi.innerHTML = '<tr><td colspan="5">Rapor oluşturulurken bir hata oluştu.</td></tr>';
        });
});

// === RENDER FONKSİYONLARI ===
// (Bu fonksiyonlar önceki cevapla aynıdır, değişiklik yok)



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

// Kodun tam ve eksiksiz olması için diğer fonksiyonları da ekliyorum.
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


    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>Ad Soyad</th>
            <th>Departman</th>
            <th>Giriş Saati</th>
            <th>Gecikme Süresi</th>
            <th>İletişim</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const gecGelenler = data.filter(p => new Date(p.IlkGiris || p.ilkGiris) > new Date(new Date(p.IlkGiris || p.ilkGiris).setHours(8, 45, 0)));

    tabloGovdesi.innerHTML = '';
    if (gecGelenler.length === 0) {

        tabloGovdesi.innerHTML = '<tr><td colspan="6">Bu aralıkta geç gelen personel bulunamadı.</td></tr>';
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

        const email = p.eMail || p.EMail;
        const tel = p.tel || p.Tel;

        let iletisimHtml = '';
        if (email && email.trim() !== '') {
            iletisimHtml += `
                <a href="mailto:${email}" class="icon-link" title="${email}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/></svg>
                </a>`;
        }
        if (tel && tel.trim() !== '') {
            iletisimHtml += `
                <a href="tel:${tel}" class="icon-link" title="${tel}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.938 17.938 0 0 0 4.154 6.608 17.938 17.938 0 0 0 6.608 4.154c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>
                </a>`;
        }



        tr.innerHTML = `
            <td>${new Date(p.Tarih || p.tarih).toLocaleDateString('tr-TR')}</td>
            <td>${p.Ad || p.ad} ${p.Soyad || p.soyad}</td>
            <td>${p.Departman || p.departman || 'N/A'}</td>
            <td>${girisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${gecikmeDakikasi} dk</td>
            <td class="iletisim-ikonlari">${iletisimHtml || 'N/A'}</td>
        `;
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