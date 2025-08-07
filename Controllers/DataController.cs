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
        private readonly string _connectionString = "Data Source=APP-ACCESS\\MEYER;Initial Catalog=TPANGEL15130TESTM5_Meyer;Integrated Security=True;Pooling=False;Connect Timeout=30;Trust Server Certificate=True;Application Name=vscode-mssql;Application Intent=ReadWrite;Command Timeout=30";

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



        [HttpGet("getinfo/{userId}")]
        public IActionResult Getinfo(int userId)
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // Sadece istenen personeli getirmesi için WHERE şartı eklendi
                string query = @"
           SELECT s.* , P.fotoimage from Sicil s, SicilFoto P where CAST(S.UserID AS INT) = @userId  and s.ID = P.sicilid
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
                string query = @"
                    SELECT
                        S.UserID,
                        S.Ad,
                        S.Soyad,
                        B.Ad AS 'departman',
                            CONVERT(date, P.EventTime) AS Tarih,
                            MIN(P.EventTime) AS IlkGiris,
                            MAX(P.EventTime) AS SonCikis,
                           DATEDIFF(MINUTE,
                                MIN(P.EventTime),
                                MAX(P.EventTime)
                                    ) AS ToplamMesaiDakika
                    FROM
                        Pool P
                    JOIN
                        Sicil S ON CAST(P.UserID AS INT) = S.UserID
                    LEFT JOIN
                        cbo_bolum B ON S.Bolum = B.ID
                    WHERE
                        S.UserID = @userId -- Kullanıcı filtresi korunuyor
                    GROUP BY
                        S.UserID, S.Ad, S.Soyad, B.Ad, CONVERT(date, P.EventTime)
                    HAVING
                        MIN(P.EventTime) < MAX(P.EventTime);";

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
                                departman = reader["departman"]
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
                  -- 1. Adım: Her personele ait fotoğrafları numaralandırıp sadece ilkini seçeceğimiz bir CTE oluşturuyoruz.
                    WITH SinglePhoto AS (
                    SELECT
                        sicilid,
                        fotoimage,
                            ROW_NUMBER() OVER(PARTITION BY sicilid ORDER BY sicilid) AS rn
                    FROM
                        SicilFoto
                            )
                        SELECT
                            S.UserID,
                            S.Ad,
                            S.Soyad,
                            B.Ad AS departman,
                            SP.fotoimage AS FotoData
                        FROM
                            Sicil S
                        LEFT JOIN
                            cbo_bolum B ON S.Bolum = B.ID
                        LEFT JOIN
                            SinglePhoto SP ON S.ID = SP.sicilid AND SP.rn = 1;";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string ad = reader["Ad"] == DBNull.Value ? null : reader["Ad"].ToString();
                        string soyad = reader["Soyad"] == DBNull.Value ? null : reader["Soyad"].ToString();
                        string departman = reader["departman"] == DBNull.Value ? null : reader["departman"].ToString();

                        string fotoBase64 = null;
                        if (reader["FotoData"] != DBNull.Value)
                        {
                            byte[] fotoBytes = (byte[])reader["FotoData"];
                            fotoBase64 = Convert.ToBase64String(fotoBytes);
                        }

                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            Departman = departman,
                            Ad = ad,
                            Soyad = soyad,
                            FotoBase64 = fotoBase64
                        });
                    }
                }
            }
            return Ok(result);
        }

        [HttpGet("gunluk-ozet")]
        public IActionResult GetGunlukOzet([FromQuery] DateTime? tarih)
        {
            DateTime sorguTarihi = tarih ?? DateTime.Today;
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                S.UserID,
                S.Ad,
                S.Soyad,
                B.Ad as 'departman',
                MIN(P.EventTime) AS IlkGiris, -- Sadece o günkü en erken saat
                MAX(P.EventTime) AS SonCikis,  -- Sadece o günkü en geç saat
                CASE
                    WHEN MAX(P.EventTime) > DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime)))
                    THEN DATEDIFF(
                        MINUTE,
                        DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime))),
                        MAX(P.EventTime)
                    )
                    ELSE 0
                END AS FazlaMesaiDakika
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE CONVERT(date, P.EventTime) = @Tarih
            GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad, CONVERT(date, P.EventTime)
            -- HAVING şartı, gün içinde en az iki farklı hareket olmasını sağlar
            HAVING MIN(P.EventTime) < MAX(P.EventTime);  ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Tarih", sorguTarihi.Date);

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
                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"],
                                FazlaMesaiDakika = reader["FazlaMesaiDakika"]
                            });
                        }
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

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
            IF OBJECT_ID('tempdb..#GunlukMesai') IS NOT NULL
                DROP TABLE #GunlukMesai;

            -- 1. ADIM: Temel veri, TerminalID'ye bakılmaksızın en erken ve en geç saatlere göre oluşturuluyor.
            SELECT
                S.UserID,
                S.Ad,
                S.Soyad,
                B.Ad AS departman,
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris, -- Sadece en erken saat
                MAX(P.EventTime) AS SonCikis  -- Sadece en geç saat
            INTO #GunlukMesai
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad, CONVERT(date, P.EventTime)
            HAVING MIN(P.EventTime) < MAX(P.EventTime); -- Gün içinde en az iki farklı hareket olmalı

            -- SORGU 1: Personel Bazlı Özetler (Bu sorgu aynı kalabilir, #GunlukMesai'den besleniyor)
            SELECT
                UserID, Ad, Soyad, departman,
                SUM(CASE WHEN IlkGiris > DATEADD(minute, 30, DATEADD(hour, 8, CAST(Tarih AS datetime))) THEN 1 ELSE 0 END) AS GecKalmaSayisi,
                SUM(CASE WHEN SonCikis < DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))) THEN 1 ELSE 0 END) AS ErkenCikmaSayisi,

                SUM(CASE WHEN SonCikis > DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))) THEN DATEDIFF(MINUTE, DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))), SonCikis) ELSE 0 END) AS ToplamFazlaMesaiDakika
            FROM #GunlukMesai
            GROUP BY UserID, Ad, Soyad, departman;

            -- SORGU 2: Aralığın En'leri (Bu sorgu aynı kalabilir, #GunlukMesai'den besleniyor)
            WITH Numaralandirilmis AS (
                SELECT *,
                    ROW_NUMBER() OVER(PARTITION BY Tarih ORDER BY IlkGiris ASC) as rn_erken,
                    ROW_NUMBER() OVER(PARTITION BY Tarih ORDER BY SonCikis DESC) as rn_gec
                FROM #GunlukMesai
            )
            SELECT
                E.Tarih,
                E.Ad + ' ' + E.Soyad AS EnErkenGelenIsim,
                E.IlkGiris AS EnErkenGelisSaati,
                G.Ad + ' ' + G.Soyad AS EnGecCikanIsim,
                G.SonCikis AS EnGecCikisSaati
            FROM Numaralandirilmis E
            JOIN Numaralandirilmis G ON E.Tarih = G.Tarih
            WHERE E.rn_erken = 1 AND G.rn_gec = 1
            ORDER BY E.Tarih;

            -- SORGU 3: Departman Bazlı Analizler (Bu sorgu aynı kalabilir, #GunlukMesai'den besleniyor)
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

        [HttpGet("aralik-detaylari")]
        public IActionResult GetAralikDetaylari([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
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
                B.Ad AS departman,
                S.EMail,
                S.CepTelefon,
               
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris, -- Sadece en erken saat
                MAX(P.EventTime) AS SonCikis  -- Sadece en geç saat
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE CONVERT(date, P.EventTime) BETWEEN @baslangic AND @bitis
            GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad,S.EMail,S.CepTelefon, CONVERT(date, P.EventTime)
            -- HAVING şartı, gün içinde en az iki farklı hareket olmasını sağlar
            HAVING MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih, IlkGiris;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
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
                                Tarih = reader["Tarih"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"],

                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }






        [HttpGet("getGelmeyenler")]
        public IActionResult GetGelmeyenler([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Sorgunun son adımı, devamsızlıkları gün sayısına göre özetleyecek şekilde güncellendi.
                string query = @"
            IF @Baslangic < '2024-01-01'
              BEGIN 
            -- 1. ADIM: Tarih aralığındaki günleri üreten takvim.
                   WITH Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih)
                FROM Takvim
                WHERE Tarih < @Bitis
            ),

            -- 2. ADIM: O gün kimlerin işe geldiğini bulalım.
            GelenPersoneller AS (
                SELECT DISTINCT
                    CONVERT(date, P.EventTime) AS Tarih,
                    CAST(P.SicilID AS INT) AS UserID
                FROM Pool P
                WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),

            -- 3. ADIM: O gün çalışması gereken personeli ve iletişim bilgilerini bulalım.
            BeklenenGelisler AS (
                SELECT
                    T.Tarih,
                    S.UserID, S.Ad, S.Soyad, B.Ad AS departman,
                    S.EMail, S.CepTelefon AS CepTelefon
                FROM Takvim T
                CROSS JOIN Sicil S
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
            )

            -- 4. ADIM: Devamsızları bulup, kişi bazında devamsızlık yaptıkları GÜN SAYISINI toplayalım.
            SELECT
                BG.UserID, BG.Ad, BG.Soyad, BG.departman,
                BG.EMail, BG.CepTelefon,
                COUNT(BG.Tarih) AS DevamsizlikGunSayisi -- Devamsızlık yapılan günleri sayıyoruz
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL
            GROUP BY -- Sonuçları kişiye göre grupluyoruz
                BG.UserID, BG.Ad, BG.Soyad, BG.departman, BG.EMail, BG.CepTelefon
            ORDER BY
                DevamsizlikGunSayisi DESC
            OPTION (MAXRECURSION 0);

        END
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
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
                                devamsizlikGunSayisi = reader["DevamsizlikGunSayisi"] // YENİ
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }






        [HttpGet("getIzinliler")]
        public IActionResult GetIzinliler([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // Izinler tablosundan, belirtilen tarih aralığıyla kesişen kayıtları getiren sorgu.
                string query = @"
            SELECT
                S.ID,
                S.Ad,
                S.Soyad,
                B.Ad AS departman,
                S.EMail,
                S.CepTelefon AS CepTelefon,
                I.BasTarih,
                I.BitTarih
                -- I.IzinTuru -- Eğer izin türünü tutan bir kolonunuz varsa bunu da ekleyebilirsiniz
            FROM
                Izinler I
            JOIN
                Sicil S ON I.SicilID = S.ID -- JOIN için doğru kolon adını kullandığınızdan emin olun
            LEFT JOIN
                cbo_bolum B ON S.Bolum = B.ID
            WHERE
                -- İzin başlangıcı, rapor bitişinden ÖNCE mi?
                CONVERT(date, I.BasTarih) <= @Bitis 
                AND 
                -- İzin bitişi, rapor başlangıcından SONRA mı?
                CONVERT(date, I.BitTarih) >= @Baslangic
            ORDER BY
                I.BasTarih, S.Ad;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["ID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"],
                                // DÜZELTME: 'Tarih' yerine iznin başlangıç ve bitiş tarihlerini döndürüyoruz.
                                IzinBaslangic = reader["BasTarih"],
                                IzinBitis = reader["BitTarih"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }






        // DataController.cs dosyanıza bu yeni metodu ekleyin

        [HttpGet("getGelmeyenlerDetay")]
        public IActionResult GetGelmeyenlerDetay([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Bu sorgu, devamsızlıkları özetlemek yerine gün bazında detaylı listeler.
                string query = @"
            -- 1. ADIM: Tarih aralığındaki günleri üreten takvim.
            WITH Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih)
                FROM Takvim
                WHERE Tarih < @Bitis
            ),

            -- 2. ADIM: O gün kimlerin işe geldiğini bulalım.
            GelenPersoneller AS (
                SELECT DISTINCT
                    CONVERT(date, P.EventTime) AS Tarih,
                    CAST(P.SicilID AS INT) AS UserID
                FROM Pool P
                WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),

            -- 3. ADIM: O gün çalışması gereken personeli ve iletişim bilgilerini bulalım.
            BeklenenGelisler AS (
                SELECT
                    T.Tarih,
                    S.UserID, S.Ad, S.Soyad, B.Ad AS departman,
                    S.EMail, S.CepTelefon AS CepTelefon
                FROM Takvim T
                CROSS JOIN Sicil S
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
            )

            -- 4. ADIM: Gelmesi beklenenlerden gelenleri çıkararak devamsızlıkların GÜNLÜK DÖKÜMÜNÜ listeleyelim.
            SELECT
                BG.Tarih, BG.UserID, BG.Ad, BG.Soyad, BG.departman,
                BG.EMail, BG.CepTelefon
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL -- Devamsızlık filtresi
            ORDER BY BG.Tarih, BG.Ad
            OPTION (MAXRECURSION 0);
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
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







    }





    }