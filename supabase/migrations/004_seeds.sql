-- ============================================================
-- Seed data
-- ============================================================

-- 47 Kenya counties
insert into counties (name) values
('Mombasa'),('Kwale'),('Kilifi'),('Tana River'),('Lamu'),('Taita Taveta'),
('Garissa'),('Wajir'),('Mandera'),('Marsabit'),('Isiolo'),('Meru'),
('Tharaka-Nithi'),('Embu'),('Kitui'),('Machakos'),('Makueni'),('Nyandarua'),
('Nyeri'),('Kirinyaga'),('Murang''a'),('Kiambu'),('Turkana'),('West Pokot'),
('Samburu'),('Trans Nzoia'),('Uasin Gishu'),('Elgeyo-Marakwet'),('Nandi'),
('Baringo'),('Laikipia'),('Nakuru'),('Narok'),('Kajiado'),('Kericho'),
('Bomet'),('Kakamega'),('Vihiga'),('Bungoma'),('Busia'),('Siaya'),
('Kisumu'),('Homa Bay'),('Migori'),('Kisii'),('Nyamira'),('Nairobi');

-- Public chartered universities (subset; extend as needed)
insert into universities (name, email_domain) values
('University of Nairobi','uonbi.ac.ke'),
('Kenyatta University','ku.ac.ke'),
('Jomo Kenyatta University of Agriculture and Technology','students.jkuat.ac.ke'),
('Moi University','mu.ac.ke'),
('Egerton University','egerton.ac.ke'),
('Maseno University','maseno.ac.ke'),
('Masinde Muliro University of Science and Technology','mmust.ac.ke'),
('Dedan Kimathi University of Technology','dkut.ac.ke'),
('Technical University of Kenya','tukenya.ac.ke'),
('Technical University of Mombasa','tum.ac.ke'),
('Pwani University','pwani.ac.ke'),
('Kisii University','kisiiuniversity.ac.ke'),
('University of Eldoret','uoeld.ac.ke'),
('Maasai Mara University','mmarau.ac.ke'),
('Jaramogi Oginga Odinga University','jooust.ac.ke'),
('Laikipia University','laikipia.ac.ke'),
('South Eastern Kenya University','seku.ac.ke'),
('Meru University of Science and Technology','must.ac.ke'),
('Multimedia University of Kenya','mmu.ac.ke'),
('University of Kabianga','kabianga.ac.ke'),
('Karatina University','karu.ac.ke'),
('Kibabii University','kibabii.ac.ke'),
('Rongo University','rongovarsity.ac.ke'),
('Co-operative University of Kenya','cuk.ac.ke'),
('Taita Taveta University','ttu.ac.ke'),
('Murang''a University of Technology','mut.ac.ke'),
('University of Embu','embuni.ac.ke'),
('Machakos University','mksu.ac.ke'),
('Kirinyaga University','kyu.ac.ke'),
('Garissa University','gu.ac.ke'),
('Chuka University','chuka.ac.ke'),
('Alupe University','alupe.ac.ke'),
('Kaimosi Friends University','kafu.ac.ke'),
('Tom Mboya University','tmu.ac.ke'),
('Tharaka University','tharaka.ac.ke'),
('Strathmore University','strathmore.edu'),
('Daystar University','daystar.ac.ke'),
('United States International University-Africa','usiu.ac.ke'),
('Catholic University of Eastern Africa','cuea.edu'),
('University of Eastern Africa Baraton','ueab.ac.ke'),
('Africa Nazarene University','anu.ac.ke'),
('KCA University','kca.ac.ke'),
('Mount Kenya University','mku.ac.ke'),
('Kabarak University','kabarak.ac.ke'),
('Zetech University','zetech.ac.ke'),
('Riara University','riarauniversity.ac.ke'),
('Pan Africa Christian University','pacuniversity.ac.ke'),
('Scott Christian University','scott.ac.ke'),
('Kenyatta University','ku.ac.ke') -- dedupe safety, ignored by unique
on conflict (email_domain) do nothing;

-- Gifts (icon URLs assume /public/gifts/*.svg)
insert into gifts (name, icon_url, price_ksh) values
('Sweet', '/gifts/sweet.svg', 5),
('Biscuit', '/gifts/biscuit.svg', 10),
('Soda', '/gifts/soda.svg', 20),
('Samosa', '/gifts/samosa.svg', 30),
('Chapati', '/gifts/chapati.svg', 40),
('Chips', '/gifts/chips.svg', 60),
('Chocolate', '/gifts/chocolate.svg', 80),
('Smokie Pasua', '/gifts/smokie.svg', 100),
('Chicken', '/gifts/chicken.svg', 200),
('Nyama Choma', '/gifts/nyama.svg', 500);

-- Legal documents (draft)
insert into legal_documents (type, version, body) values
('terms', '1.0', 'Draft Terms — to be finalized.'),
('privacy', '1.0', 'Draft Privacy — to be finalized.'),
('rules', '1.0', 'Draft Rules — to be finalized.');