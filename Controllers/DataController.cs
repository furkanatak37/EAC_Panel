using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Data.SqlClient;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DataController : ControllerBase
    {
        private readonly string _connectionString = "Data Source=srvpmeyerdb01\\MSSQL_MEYER;Initial Catalog=TPANGEL15130_Meyer;Integrated Security=True;Pooling=False;Connect Timeout=30;Trust Server Certificate=True;Application Name=vscode-mssql;Application Intent=ReadWrite;Command Timeout=30";

        [HttpGet("testconnection")]
        public async Task<IActionResult> TestConnection()
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                try
                {
                    await connection.OpenAsync();
                    return Ok("Veritabanı bağlantısı başarıyla kuruldu!");
                }
                catch (SqlException ex)
                {
                    return StatusCode(500, $"Veritabanı bağlantı hatası: {ex.Message}");
                }
            }
        }

        [HttpGet("getinfoDetay/{userId}")]
        public IActionResult GetinfoDetay(int userId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Sorgudaki JOIN şartı ve C# kodundaki anahtar adı düzeltildi.
                string query = @"
            WITH YetkiListesi AS (
                SELECT 
                    s1.UserID,
                    STUFF(
                        (
                            SELECT DISTINCT ', ' + y.Aciklama
                            FROM (
                                SELECT CAST('<M>' + REPLACE(s1.yetkistr, ';', '</M><M>') + '</M>' AS XML) AS x
                            ) AS a
                            CROSS APPLY a.x.nodes('/M') AS Split(b)
                            JOIN Yetki y ON y.ID = Split.b.value('.', 'int')
                            WHERE s1.yetkistr IS NOT NULL AND Split.b.value('.', 'varchar(50)') <> ''
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'), 1, 2, ''
                    ) AS YetkiAciklamalari
                FROM Sicil s1
                WHERE s1.UserID = @userId
            )
            SELECT 
                s.*, 
                p.fotoimage, 
                y.YetkiAciklamalari,
                b.Ad AS Departman
            FROM Sicil s
            -- DÜZELTME 1: JOIN şartı, personel ID'si üzerinden olacak şekilde güncellendi.
            LEFT JOIN SicilFoto p ON s.ID = p.sicilid 
            LEFT JOIN YetkiListesi y ON s.UserID = y.UserID
            LEFT JOIN cbo_bolum b ON s.Bolum = b.ID
            WHERE s.UserID = @userId;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@userId", userId);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var personelData = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                var colName = reader.GetName(i).ToLower();
                                var colValue = reader.GetValue(i);

                                var atlanacakKolonlar = new List<string> { "bolum", "firma", "pozisyon", "altfirma", "degistiren", "fotoimage", "yetkistr" };
                                if (atlanacakKolonlar.Contains(colName))
                                {
                                    continue;
                                }

                                // Bu if bloğu artık gereksiz çünkü 'fotoimage' atlanacakKolonlar listesinde
                                // Ancak Base64 dönüşümü için ayrı bir kontrol ekliyoruz.
                                if (colValue != DBNull.Value)
                                {
                                    personelData[colName] = colValue;
                                }
                            }

                            // DÜZELTME 2: Fotoğrafı ayrı olarak oku ve anahtarı küçük harfle ekle.
                            if (reader["fotoimage"] != DBNull.Value)
                            {
                                byte[] fotoBytes = (byte[])reader["fotoimage"];
                                personelData["fotobase64"] = Convert.ToBase64String(fotoBytes);
                            }

                            result.Add(personelData);
                        }
                    }
                }
            }
            return Ok(result);
        }

        [HttpGet("getinfo/{userId}")]
        public IActionResult Getinfo(int userId)
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
          SELECT
    s.*, -- Sicil tablosundaki tüm kolonları getirir
    P.fotoimage, -- SicilFoto tablosundan fotoğrafı getirir
    B.Ad AS Departman -- YENİ: cbo_bolum tablosundan departman adını getirir
FROM
    Sicil s
LEFT JOIN
    SicilFoto P ON s.ID = P.sicilid
LEFT JOIN
    cbo_bolum B ON s.Bolum = B.ID -- YENİ: Departman tablosunu ekliyoruz
WHERE
    CAST(S.UserID AS INT) = @userId;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    // Bu parametre artık WHERE şartı tarafından kullanılacak
                    cmd.Parameters.AddWithValue("@UserId", userId);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {

                            string fotoBase64 = null;
                            if (reader["fotoimage"] != DBNull.Value)
                            {
                                byte[] fotoBytes = (byte[])reader["fotoimage"];
                                fotoBase64 = Convert.ToBase64String(fotoBytes);
                            }

                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                PersonleNo = reader["PersonelNo"],
                                Giris = reader["GirisTarih"],
                                Dogum = reader["DogumTarih"],
                                Tel = reader["CepTelefon"],
                                Email= reader["Email"],
                                Departman = reader["Departman"],


                                foto = fotoBase64
                            });
                        }
                    }
                }
            }

            return Ok(result);



        }

        [HttpGet("personel-mesai")]
        public IActionResult GetPersonelMesai()
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
SELECT
    S.UserID,
    S.Ad,
    S.Soyad,
    CONVERT(date, P.EventTime) AS Tarih,
    
    -- DÜZELTME: Sadece o günkü en erken saat alınıyor
    MIN(P.EventTime) AS IlkGiris,
    
    -- DÜZELTME: Sadece o günkü en geç saat alınıyor
    MAX(P.EventTime) AS SonCikis,
    
    DATEDIFF(MINUTE,
        MIN(P.EventTime),
        MAX(P.EventTime)
    ) AS ToplamMesaiDakika
FROM
    Pool P
JOIN
    Sicil S ON CAST(P.UserID AS INT) = S.UserID
-- DÜZELTME: Terminaller tablosuna artık gerek yok
GROUP BY
    S.UserID, S.Ad, S.Soyad, CONVERT(date, P.EventTime)
-- DÜZELTME: HAVING şartı basitleştirildi
HAVING
    MIN(P.EventTime) < MAX(P.EventTime);
                ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            Ad = reader["Ad"],
                            Soyad = reader["Soyad"],
                            Tarih = reader["Tarih"],
                            IlkGiris = reader["IlkGiris"],
                            SonCikis = reader["SonCikis"],
                            ToplamMesaiDakika = reader["ToplamMesaiDakika"]
                        });
                    }
                }
            }

            return Ok(result);
        }


        //=================================
        // userıd si girilen çalışanın tüm mesai verilerini çeken api
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================

        [HttpGet("mesai/{userId}")]
        public IActionResult GetPersonelMesai(int userId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                // DÜZELTME: Sorguya SicilID, PersonelNo ve CardID eklendi.
                string query = @"
            SELECT
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris,
                MAX(P.EventTime) AS SonCikis,
                DATEDIFF(MINUTE, MIN(P.EventTime), MAX(P.EventTime)) AS ToplamMesaiDakika,
                S.ID,
                S.PersonelNo,
                U.CardID
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            LEFT JOIN UserList U ON S.UserID = U.UserID
            WHERE S.UserID = @UserId
            GROUP BY CONVERT(date, P.EventTime), S.ID, S.PersonelNo, U.CardID
            HAVING MIN(P.EventTime) < MAX(P.EventTime);
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                Tarih = reader["Tarih"],
                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"],
                                ToplamMesaiDakika = reader["ToplamMesaiDakika"],
                                // YENİ: Yeni verileri JSON'a ekliyoruz
                                SicilID = reader["ID"],
                                PersonelNo = reader["PersonelNo"],
                                CardID = reader["CardID"],
                                UserID=userId
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }



        //=================================
        // Personel listesi ni çeken api , personlellerin ad,soyad,departman, ve foto bilgisini getiriyor
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================
        [HttpGet("personeller")]
        public IActionResult GetPersoneller()
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            WITH SinglePhoto AS (
                SELECT sicilid, fotoimage, ROW_NUMBER() OVER(PARTITION BY sicilid ORDER BY sicilid) AS rn
                FROM SicilFoto
            )
            SELECT
                S.UserID, S.Ad, S.Soyad,
                B.Ad AS DepartmanAdi,
                F.Ad AS FirmaAdi,
                AF.Ad AS AltFirmaAdi,
                SP.fotoimage AS FotoData
            FROM Sicil S
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            LEFT JOIN cbo_firma F ON S.firma = F.ID
            LEFT JOIN cbo_altfirma AF ON S.altfirma = AF.ID
            LEFT JOIN SinglePhoto SP ON S.ID = SP.sicilid AND SP.rn = 1
            WHERE 
                -- 1. Kural: Personel aktif olmalı
                S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
                -- 2. YENİ KURAL: Ve personelin son 30 gün içinde Pool tablosunda en az bir kaydı olmalı
                AND EXISTS (
                    SELECT 1 
                    FROM Pool P 
                    WHERE CAST(P.UserID AS INT) = S.UserID 
                      AND P.EventTime >= DATEADD(day, -30, GETDATE())
                );
        
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            Ad = reader["Ad"]?.ToString(),
                            Soyad = reader["Soyad"]?.ToString(),
                            Departman = reader["DepartmanAdi"]?.ToString(),
                            Firma = reader["FirmaAdi"]?.ToString(),
                            AltFirma = reader["AltFirmaAdi"]?.ToString(),
                            FotoBase64 = (reader["FotoData"] != DBNull.Value) ? Convert.ToBase64String((byte[])reader["FotoData"]) : null
                        });
                    }
                }
            }
            return Ok(result);
        }


        //=================================
        // Verilen aralıktaki , geç gelen,erken gelen, geç çıkan, personlleri seçen ve bu personlleri departmanına göre de gruplandıran api sorgusu
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================



   




        [HttpGet("aralik-raporu")]
        public IActionResult GetAralikRaporu([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var personelOzetleri = new List<object>();
            var araliginEnleri = new List<object>();
            var departmanOzetleri = new List<object>();
            // Diğer rapor listelerini de burada tanımlayabilirsiniz (devamsızlar, izinliler vb.)

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Sorgu, sadece son 30 günde aktif olan personelleri dikkate alacak şekilde güncellendi.
                string query = @"
            IF OBJECT_ID('tempdb..#GunlukMesai') IS NOT NULL
                DROP TABLE #GunlukMesai;

            -- 1. ADIM: Temel veri, sadece ilgili personeller için oluşturuluyor.
            SELECT
                S.UserID, S.Ad, S.Soyad, B.Ad AS departman,
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris,
                MAX(P.EventTime) AS SonCikis
            INTO #GunlukMesai
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE 
                CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
                -- YENİ KURAL: Sadece aktif ve son 30 günde hareketi olan personelleri dahil et
                AND S.GirisTarih IS NOT NULL 
                AND S.CikisTarih IS NULL
                AND EXISTS (
                    SELECT 1 
                    FROM Pool P_check 
                    WHERE CAST(P_check.UserID AS INT) = S.UserID 
                      AND P_check.EventTime >= DATEADD(day, -30, GETDATE())
                )
            GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad, CONVERT(date, P.EventTime)
            HAVING MIN(P.EventTime) < MAX(P.EventTime);

            -- SORGU 1: Personel Bazlı Özetler (Değişiklik yok)
            SELECT
                UserID, Ad, Soyad, departman,
                SUM(CASE WHEN IlkGiris > DATEADD(minute, 45, DATEADD(hour, 8, CAST(Tarih AS datetime))) THEN 1 ELSE 0 END) AS GecKalmaSayisi,
                SUM(CASE WHEN SonCikis < DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))) THEN 1 ELSE 0 END) AS ErkenCikmaSayisi,
                SUM(CASE WHEN SonCikis > DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))) THEN DATEDIFF(MINUTE, DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))), SonCikis) ELSE 0 END) AS ToplamFazlaMesaiDakika
            FROM #GunlukMesai
            GROUP BY UserID, Ad, Soyad, departman;

            -- SORGU 2: Aralığın En'leri (Değişiklik yok)
            WITH Numaralandirilmis AS (
                SELECT *,
                    ROW_NUMBER() OVER(PARTITION BY Tarih ORDER BY IlkGiris ASC) as rn_erken,
                    ROW_NUMBER() OVER(PARTITION BY Tarih ORDER BY SonCikis DESC) as rn_gec
                FROM #GunlukMesai
            )
            SELECT
                E.Tarih, E.Ad + ' ' + E.Soyad AS EnErkenGelenIsim, E.IlkGiris AS EnErkenGelisSaati,
                G.Ad + ' ' + G.Soyad AS EnGecCikanIsim, G.SonCikis AS EnGecCikisSaati
            FROM Numaralandirilmis E
            JOIN Numaralandirilmis G ON E.Tarih = G.Tarih
            WHERE E.rn_erken = 1 AND G.rn_gec = 1
            ORDER BY E.Tarih;

            -- SORGU 3: Departman Bazlı Analizler (Değişiklik yok)
            SELECT
                ISNULL(departman, 'Belirtilmemiş') AS Departman,
                COUNT(DISTINCT UserID) as KisiSayisi,
                CONVERT(time, DATEADD(ms, AVG(CAST(DATEDIFF(ms, '00:00:00', CONVERT(time, IlkGiris)) AS BIGINT)), '00:00:00')) AS OrtalamaGiris,
                CONVERT(time, DATEADD(ms, AVG(CAST(DATEDIFF(ms, '00:00:00', CONVERT(time, SonCikis)) AS BIGINT)), '00:00:00')) AS OrtalamaCikis
            FROM #GunlukMesai
            GROUP BY departman;

           
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {

                        while (reader.Read())
                        {
                            personelOzetleri.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                GecKalmaSayisi = reader["GecKalmaSayisi"],
                                ErkenCikmaSayisi = reader["ErkenCikmaSayisi"],

                                ToplamFazlaMesaiDakika = reader["ToplamFazlaMesaiDakika"]
                            });
                        }

                        if (reader.NextResult())
                        {
                            while (reader.Read())
                            {
                                araliginEnleri.Add(new
                                {
                                    Tarih = reader["Tarih"],
                                    EnErkenGelenIsim = reader["EnErkenGelenIsim"],
                                    EnErkenGelisSaati = reader["EnErkenGelisSaati"],
                                    EnGecCikanIsim = reader["EnGecCikanIsim"],
                                    EnGecCikisSaati = reader["EnGecCikisSaati"]
                                });
                            }
                        }


                        if (reader.NextResult())
                        {
                            while (reader.Read())
                            {
                                departmanOzetleri.Add(new
                                {
                                    Departman = reader["Departman"],
                                    KisiSayisi = reader["KisiSayisi"],
                                    OrtalamaGiris = reader["OrtalamaGiris"],
                                    OrtalamaCikis = reader["OrtalamaCikis"]
                                });
                            }
                        }
                    }
                }
            }
            var finalResult = new
            {
                PersonelOzetleri = personelOzetleri,
                AraliginEnleri = araliginEnleri,
                DepartmanOzetleri = departmanOzetleri
            };

            return Ok(finalResult);
        }


























        //=================================
        // aralık-raporu api nda çıkan outputların detaylı bilgisini veren kısımi listele butonuna tıklandığında çalışacak sorgu
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================

        // DataController.cs dosyanızdaki bu metodu güncelleyin
        [HttpGet("aralik-detaylari")]
        public IActionResult GetAralikDetaylari([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                            [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                S.UserID, S.Ad, S.Soyad, S.PersonelNo, S.ID,
                B.Ad AS DepartmanAdi,
                F.Ad AS FirmaAdi,
                AF.Ad AS AltFirmaAdi,
                POZ.Ad AS PozisyonAdi,
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris,
                MAX(P.EventTime) AS SonCikis
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            LEFT JOIN cbo_pozisyon POZ ON S.pozisyon = POZ.ID
            LEFT JOIN cbo_firma F ON S.firma = F.ID
            LEFT JOIN cbo_altfirma AF ON S.altfirma = AF.ID
            WHERE 
                CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
                AND S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
                AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
            GROUP BY 
                S.UserID, S.Ad, S.Soyad, S.PersonelNo, S.ID,
                B.Ad, F.Ad, AF.Ad, POZ.Ad, 
                CONVERT(date, P.EventTime)
            HAVING MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih, IlkGiris;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                PersonelNo = reader["PersonelNo"],
                                SicilID = reader["ID"],
                                Departman = reader["DepartmanAdi"],
                                Firma = reader["FirmaAdi"],
                                AltFirma = reader["AltFirmaAdi"],
                                Pozisyon = reader["PozisyonAdi"],
                                Tarih = reader["Tarih"],
                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }
        //=================================
        // bu api seçili gün aralığında gelmeyen personlleri listeliyor , sicil tablosunda işe giriş,çıkış tarihlerine bakarak seçili gün aralığında mevcut çalışanlar arasında
        // pool tablosundan o gün giriş,çıkış datası olmayan personelleri bulup listeliyor.
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================

        [HttpGet("getGelmeyenler")]
        // YENİ: Opsiyonel filtre parametreleri eklendi
        public IActionResult GetGelmeyenler([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                     [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Sorgu, aktif personel filtresini ve opsiyonel filtreleri içerecek şekilde güncellendi.
                string query = @"
            -- 1. ADIM: Sadece aktif personeli (işe girmiş, çıkmamış) bir CTE'de toplayalım.
            WITH AktifPersoneller AS (
                SELECT UserID, Ad, Soyad, Bolum, firma, altfirma, GirisTarih, CikisTarih, EMail, CepTelefon
                FROM Sicil
                WHERE GirisTarih IS NOT NULL AND CikisTarih IS NULL
            ),

            -- 2. ADIM: Tarih aralığındaki günleri üreten takvim.
            Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            ),

            -- 3. ADIM: O gün kimlerin işe geldiğini bulalım.
            GelenPersoneller AS (
                SELECT DISTINCT CONVERT(date, P.EventTime) AS Tarih, CAST(P.UserID AS INT) AS UserID
                FROM Pool P WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),

            -- 4. ADIM: O gün çalışması gereken AKTİF ve FİLTRELENMİŞ personeli bulalım.
            BeklenenGelisler AS (
                SELECT
                    T.Tarih, S.UserID, S.Ad, S.Soyad, B.Ad AS departman, S.EMail, S.CepTelefon
                FROM Takvim T
                CROSS JOIN AktifPersoneller S -- Artık tüm Sicil yerine sadece aktif olanları kullanıyoruz
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
                    -- YENİ: Opsiyonel Filtreler
                    AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                    AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                    AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
            )

            -- 5. ADIM: Devamsızları bulup, kişi bazında devamsızlık yaptıkları gün sayısını toplayalım.
            SELECT
                BG.UserID, BG.Ad, BG.Soyad, BG.departman, BG.EMail, BG.CepTelefon,
                COUNT(BG.Tarih) AS DevamsizlikGunSayisi
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL
            GROUP BY BG.UserID, BG.Ad, BG.Soyad, BG.departman, BG.EMail, BG.CepTelefon
            ORDER BY DevamsizlikGunSayisi DESC
            OPTION (MAXRECURSION 0);
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    // YENİ: Parametreleri sorguya ekle (eğer boş ise DBNull olarak gönder)
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"],
                                devamsizlikGunSayisi = reader["DevamsizlikGunSayisi"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }


        [HttpGet("getIzinliler")]
        public IActionResult GetIzinliler([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                  [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                S.UserID, S.Ad, S.Soyad, B.Ad AS departman, S.EMail, S.CepTelefon AS CepTelefon,
                I.BasTarih, I.BitTarih, I.Aciklama
            FROM Izinler I
            JOIN Sicil S ON I.SicilID = S.ID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE
                S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
                AND CONVERT(date, I.BasTarih) <= @Bitis 
                AND CONVERT(date, I.BitTarih) >= @Baslangic
                -- Opsiyonel Filtreler
                AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
            ORDER BY I.BasTarih, S.Ad;
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"],
                                IzinBaslangic = reader["BasTarih"],
                                IzinBitis = reader["BitTarih"],
                                IzinTuru = reader["Aciklama"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }


      
        [HttpGet("erken-cikma-detaylari")]
        public IActionResult GetErkenCikmaDetaylari([FromQuery] int userId, [FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                CONVERT(date, P.EventTime) AS Tarih,
                MAX(P.EventTime) AS SonCikis
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            WHERE 
                S.UserID = @UserId 
                AND CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY CONVERT(date, P.EventTime)
            HAVING 
                -- 1. Kural: Erken çıkmış olmalı (Örnek: 17:30 öncesi)
                MAX(P.EventTime) < DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime)))
                -- 2. Kural: Ve o gün hem giriş hem çıkış hareketi olmalı
                AND MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                Tarih = reader["Tarih"],
                                SonCikis = reader["SonCikis"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }





        [HttpGet("getGelmeyenlerDetay")]
        public IActionResult GetGelmeyenlerDetay([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                                  [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Sorguya pozisyon bilgisini eklemek için cbo_pozisyon tablosu joinlendi.
                string query = @"
            WITH AktifVeIlgiliPersoneller AS (
                SELECT * FROM Sicil
                WHERE GirisTarih IS NOT NULL AND CikisTarih IS NULL
                  AND EXISTS (
                      SELECT 1 
                      FROM Pool P_check 
                      WHERE CAST(P_check.SicilID AS INT) = Sicil.UserID 
                        AND P_check.EventTime >= DATEADD(day, -30, GETDATE())
                  )
            ),
            Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            ),
            GelenPersoneller AS (
                SELECT DISTINCT CONVERT(date, P.EventTime) AS Tarih, CAST(P.SicilID AS INT) AS UserID
                FROM Pool P WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),
            BeklenenGelisler AS (
                SELECT
                    T.Tarih, S.UserID, S.Ad, S.Soyad, B.Ad AS departman,
                    POZ.Ad AS PozisyonAdi, -- YENİ: Pozisyon adı eklendi
                    S.EMail, S.CepTelefon
                FROM Takvim T
                CROSS JOIN AktifVeIlgiliPersoneller S
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                LEFT JOIN cbo_pozisyon POZ ON S.pozisyon = POZ.ID -- YENİ JOIN
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
                    AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                    AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                    AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
            )
            SELECT
                BG.Tarih, BG.UserID, BG.Ad, BG.Soyad, BG.departman,
                BG.PozisyonAdi, -- YENİ: Pozisyon adı sonuca eklendi
                BG.EMail, BG.CepTelefon
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL
            ORDER BY BG.Tarih, BG.Ad
            OPTION (MAXRECURSION 0);
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                Pozisyon = reader["PozisyonAdi"], // YENİ
                                Tarih = reader["Tarih"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }







        // DataController.cs dosyanızdaki bu metodu güncelleyin

        [HttpGet("gec-kalma-detaylari")]
        public IActionResult GetGecKalmaDetaylari([FromQuery] int userId, [FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Bu sorgu artık, özet rapordaki gibi,
                // hem giriş hem de çıkış olan günleri dikkate alacak şekilde güncellendi.
                string query = @"
            SELECT
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris
                -- SonCikis'i C#'a göndermeyeceğiz ama HAVING'de kullanmak için hesaplamalıyız.
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            WHERE 
                S.UserID = @UserId 
                AND CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY CONVERT(date, P.EventTime)
            HAVING 
                -- 1. Kural: Geç kalmış olmalı (Örnek: 08:30 sonrası)
                MIN(P.EventTime) > DATEADD(minute, 30, DATEADD(hour, 8, CAST(CONVERT(date, P.EventTime) AS datetime)))
                
                -- 2. YENİ KURAL: Ve o gün hem giriş hem çıkış hareketi olmalı
                AND MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                Tarih = reader["Tarih"],
                                IlkGiris = reader["IlkGiris"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }


        [HttpGet("fazla-mesai-detaylari")]
        public IActionResult GetFazlaMesaiDetaylari([FromQuery] int userId, [FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                CONVERT(date, P.EventTime) AS Tarih,
                MAX(P.EventTime) AS SonCikis,
                DATEDIFF(MINUTE, 
                    DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime))), 
                    MAX(P.EventTime)
                ) AS FazlaMesaiDakika
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            WHERE 
                S.UserID = @UserId 
                AND CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY CONVERT(date, P.EventTime)
            HAVING 
                MAX(P.EventTime) > DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime)))
                AND MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                Tarih = reader["Tarih"],
                                SonCikis = reader["SonCikis"],
                                FazlaMesaiDakika = reader["FazlaMesaiDakika"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }



        // DataController.cs dosyanızdaki bu metodu güncelleyin

        [HttpGet("getDevamsizDetay")]
        // DÜZELTME: Metot artık isteğe bağlı bir userId parametresi alıyor
        public IActionResult GetDevamsizDetay([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis, [FromQuery] int? userId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            WITH Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            ),
            GelenPersoneller AS (
                SELECT DISTINCT CONVERT(date, P.EventTime) AS Tarih, CAST(P.UserID AS INT) AS UserID
                FROM Pool P WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),
            BeklenenGelisler AS (
                SELECT
                    T.Tarih, S.UserID, S.Ad, S.Soyad, B.Ad AS departman, S.EMail, S.CepTelefon AS CepTelefon
                FROM Takvim T
                CROSS JOIN Sicil S
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
                    -- DÜZELTME: Eğer bir userId gönderildiyse, sadece o kişiyi dikkate al
                    AND (@UserId IS NULL OR S.UserID = @UserId)
            )
            SELECT
                BG.Tarih, BG.UserID, BG.Ad, BG.Soyad, BG.departman, BG.EMail, BG.CepTelefon
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL
            ORDER BY BG.Tarih, BG.Ad
            OPTION (MAXRECURSION 0);
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    // DÜZELTME: Yeni userId parametresini sorguya ekle
                    cmd.Parameters.AddWithValue("@UserId", (object)userId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                Tarih = reader["Tarih"], // Artık her satırda tarih bilgisi var
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }





        [HttpGet("filtre-verileri")]
        public IActionResult GetFiltreVerileri()
        {
            var departmanlar = new List<object>();
            var firmalar = new List<object>();
            var altFirmalar = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT ID, Ad FROM cbo_bolum ORDER BY Ad;
            SELECT ID, Ad FROM cbo_firma ORDER BY Ad;
            SELECT ID, Ad FROM cbo_altfirma ORDER BY Ad;
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read()) { departmanlar.Add(new { ID = reader["ID"], Ad = reader["Ad"] }); }
                    reader.NextResult();
                    while (reader.Read()) { firmalar.Add(new { ID = reader["ID"], Ad = reader["Ad"] }); }
                    reader.NextResult();
                    while (reader.Read()) { altFirmalar.Add(new { ID = reader["ID"], Ad = reader["Ad"] }); }
                }
            }
            return Ok(new { departmanlar, firmalar, altFirmalar });
        }









        [HttpGet("filtre-haritasi")]
        public IActionResult GetFiltreHaritasi()
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                // Sadece aktif personellerin filtreleme için gerekli olan bilgilerini alıyoruz.
                string query = @"
            SELECT 
                S.UserID,
                S.firma AS FirmaId,
                f.Ad AS FirmaAdi,
                S.altfirma AS AltFirmaId,
                af.Ad AS AltFirmaAdi,
                S.Bolum AS DepartmanId,
                b.Ad AS DepartmanAdi
            FROM Sicil S
            LEFT JOIN cbo_firma f ON S.firma = f.ID
            LEFT JOIN cbo_altfirma af ON S.altfirma = af.ID
            LEFT JOIN cbo_bolum b ON S.Bolum = b.ID
            WHERE S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL;
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            FirmaId = reader["FirmaId"],
                            FirmaAdi = reader["FirmaAdi"],
                            AltFirmaId = reader["AltFirmaId"],
                            AltFirmaAdi = reader["AltFirmaAdi"],
                            DepartmanId = reader["DepartmanId"],
                            DepartmanAdi = reader["DepartmanAdi"]
                        });
                    }
                }
            }
            return Ok(result);
        }











        [HttpGet("eksik-mesai-ve-devamsizlik-raporu")]
        public IActionResult GetEksikMesaiVeDevamsizlikRaporu([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                          [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId,
                                          [FromQuery] string? durumFiltresi)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
            -- Önceki geçici tabloları temizle
            IF OBJECT_ID('tempdb..#IlgiliPersoneller') IS NOT NULL DROP TABLE #IlgiliPersoneller;
            IF OBJECT_ID('tempdb..#GunlukMesailer') IS NOT NULL DROP TABLE #GunlukMesailer;

            -- 1. ADIM: İlgili personelleri bir geçici tabloya al.
            SELECT 
                S.UserID, S.Ad, S.Soyad, S.Bolum, S.firma, S.altfirma, S.GirisTarih, S.ID AS SicilTabloID,
                B.Ad AS DepartmanAdi, F.Ad AS FirmaAdi, AF.Ad AS AltFirmaAdi
            INTO #IlgiliPersoneller
            FROM Sicil S
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            LEFT JOIN cbo_firma F ON S.firma = F.ID
            LEFT JOIN cbo_altfirma AF ON S.altfirma = AF.ID
            WHERE 
                S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
                AND EXISTS (
                    SELECT 1 FROM Pool P_check 
                    WHERE CAST(P_check.UserID AS INT) = S.UserID AND P_check.EventTime >= DATEADD(day, -30, GETDATE())
                )
                AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId);

            -- 2. ADIM: Bu personellerin mesai verilerini başka bir geçici tabloya al.
            SELECT
                S.UserID, CONVERT(date, P.EventTime) AS Tarih,
                DATEDIFF(MINUTE, MIN(P.EventTime), MAX(P.EventTime)) AS ToplamMesaiDakika,S.SicilTabloID
            INTO #GunlukMesailer
            FROM Pool P
            JOIN #IlgiliPersoneller S ON CAST(P.UserID AS INT) = S.UserID
            WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY S.UserID, CONVERT(date, P.EventTime),S.SicilTabloID
            HAVING MIN(P.EventTime) < MAX(P.EventTime);
            
            -- 3. ADIM: Takvimi oluşturalım.
            WITH Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            )
            
            -- 4. ADIM: Sonuçları birleştir.
            SELECT * FROM (
                -- Kısım 1: Eksik Mesai Yapanlar
                SELECT
                    S.UserID, S.Ad, S.Soyad, S.DepartmanAdi, S.FirmaAdi, S.AltFirmaAdi,
                    GM.Tarih, GM.ToplamMesaiDakika,S.SicilTabloID,
                    -- YENİ: Saatlik izni varsa durumu detaylı yaz
                    CASE
                        WHEN I.SicilID IS NOT NULL 
                        THEN 'Eksik Mesai (' + ISNULL('izinli : ' + IT.Aciklama, 'İzinli') + ')' + ' ' + FORMAT(I.BasTarih, 'HH:mm') + '-' + FORMAT(I.BitTarih, 'HH:mm') + ')'
                        ELSE 'Eksik Mesai'
                    END AS Durum
                FROM #GunlukMesailer GM
                JOIN #IlgiliPersoneller S ON GM.UserID = S.UserID
                -- YENİ: Saatlik izin olup olmadığını kontrol etmek için Izinler ve IzinTipleri tablolarına JOIN
                LEFT JOIN Izinler I ON GM.UserID = I.SicilID AND GM.Tarih = CONVERT(date, I.BasTarih) AND I.Saatlikizin = 1
                LEFT JOIN IzinTipleri IT ON I.TipID = IT.ID
                WHERE GM.ToplamMesaiDakika < 480

                UNION ALL

                -- Kısım 2: Devamsızlık Yapanlar
                SELECT
                    S.UserID, S.Ad, S.Soyad, S.DepartmanAdi, S.FirmaAdi, S.AltFirmaAdi,
                    T.Tarih, 0 AS ToplamMesaiDakika,S.SicilTabloID,
                    -- YENİ: Tam günlük izinleri kontrol et ve izin türünü yaz
                    CASE 
                        WHEN I.SicilID IS NOT NULL
                        THEN 'Devamsız (' + ISNULL(IT.Aciklama, 'izinli') + ')' 
                        ELSE 'Devamsız' 
                    END AS Durum
                FROM Takvim T
                CROSS JOIN #IlgiliPersoneller S
                LEFT JOIN Izinler I ON I.SicilID = S.SicilTabloID AND T.Tarih BETWEEN CONVERT(date, I.BasTarih) AND CONVERT(date, I.BitTarih) AND (I.Saatlikizin = 0 OR I.Saatlikizin IS NULL)
                LEFT JOIN IzinTipleri IT ON I.TipID = IT.ID
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND NOT EXISTS (SELECT 1 FROM #GunlukMesailer GM WHERE GM.UserID = S.UserID AND GM.Tarih = T.Tarih)
            ) AS Sonuc

WHERE (@DurumFiltresi IS NULL OR Durum LIKE '%' + @DurumFiltresi + '%')
            ORDER BY Tarih, Ad
            OPTION (MAXRECURSION 0);

        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@DurumFiltresi", string.IsNullOrEmpty(durumFiltresi) ? DBNull.Value : (object)durumFiltresi);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                SicilID = reader["SicilTabloID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["DepartmanAdi"],
                                Firma = reader["FirmaAdi"],
                                AltFirma = reader["AltFirmaAdi"],
                                Tarih = reader["Tarih"],
                                ToplamMesaiDakika = reader["ToplamMesaiDakika"],
                                Durum = reader["Durum"],
                 
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }
    }

    }