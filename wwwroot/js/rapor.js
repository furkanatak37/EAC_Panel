document.addEventListener('DOMContentLoaded', () => {
    const tabloBaslik = document.getElementById('rapor-tablo-baslik');
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const raporBaslik = document.getElementById('rapor-baslik');

    // URL'den hem rapor türünü hem de tarihi al
    const params = new URLSearchParams(window.location.search);
    const raporTuru = params.get('rapor');
    const tarih = params.get('tarih');

    if (!tarih || !raporTuru) {
        raporBaslik.textContent = "Hata";
        tabloGovdesi.innerHTML = '<tr><td colspan="5">Geçerli parametreler bulunamadı.</td></tr>';
        return;
    }

    // API'den veriyi çek
    fetch(`/api/data/gunluk-ozet?tarih=${tarih}`)
        .then(response => response.json())
        .then(data => {
            // Rapor türüne göre ilgili fonksiyonu çağır
            if (raporTuru === 'gec') {
                renderGecGelenlerRaporu(data, tarih);
            } else if (raporTuru === 'mesai') {
                renderFazlaMesaiRaporu(data, tarih);
            } else {
                throw new Error("Bilinmeyen rapor türü.");
            }
        })
        .catch(error => {
            console.error('Rapor oluşturulurken hata:', error);
            tabloGovdesi.innerHTML = '<tr><td colspan="5">Rapor oluşturulurken bir hata oluştu.</td></tr>';
        });
});

/**
 * GEÇ GELENLER raporunu oluşturur.
 */
function renderGecGelenlerRaporu(data, tarih) {
    const formatliTarih = new Date(tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    document.getElementById('rapor-baslik').textContent = `${formatliTarih} - Geç Gelen Personel Raporu`;

    // Tablo başlıklarını oluştur
    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Ad Soyad</th>
            <th>Departman</th>
            <th>Giriş Saati</th>
            <th>Gecikme Süresi</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const gecGelenler = data.filter(p => new Date(p.IlkGiris || p.ilkGiris) > new Date(new Date(p.IlkGiris || p.ilkGiris).setHours(8, 45, 0)));

    tabloGovdesi.innerHTML = '';
    if (gecGelenler.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="4">Bu tarihte geç gelen personel bulunamadı.</td></tr>';
        return;
    }

    gecGelenler.sort((a, b) => new Date(b.IlkGiris || b.ilkGiris) - new Date(a.IlkGiris || a.ilkGiris));

    gecGelenler.forEach(p => {
        const tr = document.createElement('tr');
        const girisSaati = new Date(p.IlkGiris || p.ilkGiris);
        const hedefSaat = new Date(girisSaati).setHours(8, 45, 0);
        const gecikmeDakikasi = Math.floor((girisSaati - hedefSaat) / 60000);

        if (girisSaati > new Date(girisSaati).setHours(9, 0, 0)) {
            tr.classList.add('kritik-gecikme');
        }

        tr.innerHTML = `
            <td>${p.Ad || p.ad} ${p.Soyad || p.soyad}</td>
            <td>${p.Departman || p.departman || 'N/A'}</td>
            <td>${girisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${gecikmeDakikasi} dk</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}

/**
 * FAZLA MESAİ raporunu oluşturur.
 */
/**
 * FAZLA MESAİ raporunu oluşturur.
 */
function renderFazlaMesaiRaporu(data, tarih) {
    const formatliTarih = new Date(tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    document.getElementById('rapor-baslik').textContent = `${formatliTarih} - Fazla Mesai Yapanlar Raporu`;

    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Ad Soyad</th>
            <th>Departman</th>
            <th>Çıkış Saati</th>
            <th>Fazla Mesai Süresi</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const mesaiYapanlar = data.filter(p => (p.FazlaMesaiDakika || p.fazlaMesaiDakika) > 0);

    tabloGovdesi.innerHTML = '';
    if (mesaiYapanlar.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="4">Bu tarihte fazla mesai yapan personel bulunamadı.</td></tr>';
        return;
    }

    mesaiYapanlar.sort((a, b) => (b.FazlaMesaiDakika || b.fazlaMesaiDakika) - (a.FazlaMesaiDakika || a.fazlaMesaiDakika));

    mesaiYapanlar.forEach(p => {
        const tr = document.createElement('tr');
        const mesaiDakika = p.FazlaMesaiDakika || p.fazlaMesaiDakika;

        // === YENİ EKLENEN KISIM ===
        // 30 dakikadan fazla mesaiyi kontrol et
        if (mesaiDakika > 30) {
            tr.classList.add('onemli-mesai'); // Yeşil renklendirme için class ekle
        }
        // ===========================

        const saat = Math.floor(mesaiDakika / 60);
        const dakika = mesaiDakika % 60;

        let mesaiSuresi = '';
        if (saat > 0) mesaiSuresi += `${saat} saat `;
        if (dakika > 0) mesaiSuresi += `${dakika} dakika`;

        tr.innerHTML = `
            <td>${p.Ad || p.ad} ${p.Soyad || p.soyad}</td>
            <td>${p.Departman || p.departman || 'N/A'}</td>
            <td>${new Date(p.SonCikis || p.sonCikis).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>+${mesaiSuresi.trim()}</td>
        `;
        tabloGovdesi.appendChild(tr);
    });

}