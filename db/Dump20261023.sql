CREATE DATABASE  IF NOT EXISTS `apexfit` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `apexfit`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: apexfit
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advertisements`
--

DROP TABLE IF EXISTS `advertisements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advertisements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_name` varchar(160) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` varchar(1000) NOT NULL DEFAULT '',
  `image_url` varchar(500) NOT NULL,
  `target_url` varchar(500) DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_advertisements_schedule` (`active`,`starts_at`,`ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advertisements`
--

LOCK TABLES `advertisements` WRITE;
/*!40000 ALTER TABLE `advertisements` DISABLE KEYS */;
/*!40000 ALTER TABLE `advertisements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `angola_municipalities`
--

DROP TABLE IF EXISTS `angola_municipalities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `angola_municipalities` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `province_id` int(10) unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_angola_municipality` (`province_id`,`name`),
  CONSTRAINT `fk_angola_municipalities_province` FOREIGN KEY (`province_id`) REFERENCES `angola_provinces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=653 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `angola_municipalities`
--

LOCK TABLES `angola_municipalities` WRITE;
/*!40000 ALTER TABLE `angola_municipalities` DISABLE KEYS */;
INSERT INTO `angola_municipalities` VALUES (490,1,'Ambriz'),(491,1,'Bula Atumba'),(492,1,'Dande'),(493,1,'Dembos'),(494,1,'Nambuangongo'),(495,1,'Pango Aluquém'),(497,2,'Baía Farta'),(496,2,'Balombo'),(498,2,'Benguela'),(499,2,'Bocoio'),(500,2,'Caimbambo'),(501,2,'Catumbela'),(502,2,'Chongoroi'),(503,2,'Ganda'),(504,2,'Lobito'),(505,2,'Lobito Ocidental'),(506,3,'Andulo'),(507,3,'Camacupa'),(508,3,'Catabola'),(509,3,'Chinguar'),(510,3,'Chitembo'),(511,3,'Cuemba'),(513,3,'Cuíto'),(512,3,'Cunhinga'),(514,3,'Nharea'),(515,4,'Belize'),(516,4,'Buco-Zau'),(517,4,'Cabinda'),(518,4,'Cacongo'),(519,5,'Calai'),(520,5,'Cuangar'),(521,5,'Cuchi'),(522,5,'Menongue'),(523,6,'Cuito Cuanavale'),(524,6,'Dirico'),(525,6,'Mavinga'),(526,6,'Nancova'),(527,6,'Rivungo'),(528,7,'Ambaca'),(529,7,'Banga'),(530,7,'Bolongongo'),(531,7,'Cambambe'),(532,7,'Cazengo'),(533,7,'Golungo Alto'),(534,7,'Gonguembo'),(535,7,'Lucala'),(536,7,'Quiculungo'),(537,7,'Samba Caju'),(538,8,'Amboim'),(539,8,'Cassongue'),(540,8,'Cela'),(541,8,'Conda'),(542,8,'Ebo'),(543,8,'Libolo'),(544,8,'Mussende'),(545,8,'Porto Amboim'),(546,8,'Quibala'),(547,8,'Quilenda'),(548,8,'Seles'),(549,8,'Sumbe'),(550,9,'Cahama'),(551,9,'Cuanhama'),(552,9,'Curoca'),(553,9,'Cuvelai'),(554,9,'Namacunde'),(555,9,'Ombadja'),(556,10,'Bailundo'),(557,10,'Cáala'),(558,10,'Catchiungo'),(564,10,'Chicala-Choloanga'),(565,10,'Chinjenje'),(559,10,'Ekunha'),(560,10,'Huambo'),(561,10,'Londuimbavali'),(562,10,'Longonjo'),(563,10,'Mungo'),(566,10,'Ucuma'),(567,11,'Caconda'),(568,11,'Cacula'),(569,11,'Caluquembe'),(570,11,'Chiange'),(571,11,'Chibia'),(572,11,'Chicomba'),(573,11,'Chipindo'),(574,11,'Humpata'),(575,11,'Jamba'),(576,11,'Lubango'),(577,11,'Matala'),(578,11,'Quilengues'),(579,11,'Quipungo'),(580,12,'Icolo e Bengo'),(581,12,'Quiçama'),(582,13,'Belas'),(583,13,'Cacuaco'),(584,13,'Cazenga'),(586,13,'Kilamba Kiaxi'),(585,13,'Luanda'),(587,13,'Talatona'),(588,13,'Viana'),(589,14,'Cambulo'),(590,14,'Capenda-Camulemba'),(591,14,'Caungula'),(592,14,'Chitato'),(593,14,'Cuango'),(594,14,'Cuílo'),(595,14,'Lóvua'),(596,14,'Lubalo'),(597,14,'Lucapa'),(598,14,'Xá-Muteba'),(599,15,'Cacolo'),(600,15,'Dala'),(601,15,'Muonda'),(602,15,'Saurimo'),(603,16,'Cacuso'),(604,16,'Calandula'),(605,16,'Cambundi-Catembo'),(606,16,'Cangandala'),(607,16,'Cuaba Nzogo'),(608,16,'Cunda-dia-Baze'),(609,16,'Luquembo'),(610,16,'Malanje'),(611,16,'Marimba'),(612,16,'Massango'),(613,16,'Mucari'),(614,16,'Quela'),(615,16,'Quirima'),(616,16,'Sautar'),(617,17,'Camanongue'),(618,17,'Léua'),(620,17,'Luacano'),(619,17,'Luau'),(621,17,'Moxico'),(622,18,'Alto Zambeze'),(623,18,'Bundas'),(624,18,'Cameia'),(625,18,'Lumeje'),(626,19,'Bibala'),(627,19,'Camucuio'),(628,19,'Moçâmedes'),(629,19,'Tômbwa'),(630,19,'Virei'),(631,20,'Alto Cauale'),(632,20,'Ambuíla'),(633,20,'Bembe'),(634,20,'Buengas'),(635,20,'Bungo'),(636,20,'Damba'),(637,20,'Milunga'),(638,20,'Mucaba'),(639,20,'Negage'),(640,20,'Puri'),(641,20,'Quimbele'),(642,20,'Quitexe'),(643,20,'Sanza Pombo'),(644,20,'Songo'),(645,20,'Uíge'),(646,20,'Zombo'),(647,21,'Cuimba'),(648,21,'Mbanza Kongo'),(650,21,'N\'zeto'),(649,21,'Noqui'),(651,21,'Soyo'),(652,21,'Tomboco');
/*!40000 ALTER TABLE `angola_municipalities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `angola_provinces`
--

DROP TABLE IF EXISTS `angola_provinces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `angola_provinces` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_angola_provinces_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `angola_provinces`
--

LOCK TABLES `angola_provinces` WRITE;
/*!40000 ALTER TABLE `angola_provinces` DISABLE KEYS */;
INSERT INTO `angola_provinces` VALUES (1,'Bengo'),(2,'Benguela'),(3,'Bié'),(4,'Cabinda'),(5,'Cuando'),(7,'Cuanza Norte'),(8,'Cuanza Sul'),(6,'Cubango'),(9,'Cunene'),(10,'Huambo'),(11,'Huíla'),(12,'Icolo e Bengo'),(13,'Luanda'),(14,'Lunda Norte'),(15,'Lunda Sul'),(16,'Malanje'),(17,'Moxico'),(18,'Moxico Leste'),(19,'Namibe'),(20,'Uíge'),(21,'Zaire');
/*!40000 ALTER TABLE `angola_provinces` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `action` varchar(120) NOT NULL,
  `entity` varchar(120) NOT NULL,
  `entity_id` bigint(20) unsigned DEFAULT NULL,
  `actor` varchar(190) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Homens','homens'),(2,'Mulheres','mulheres'),(3,'Pesos','pesos'),(4,'Suplementos','suplementos'),(5,'Acessórios','acessorios');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_messages`
--

DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `email` varchar(190) NOT NULL,
  `subject` varchar(200) NOT NULL DEFAULT '',
  `message` text NOT NULL,
  `status` enum('NEW','READ','REPLIED') NOT NULL DEFAULT 'NEW',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_contact_status` (`status`),
  KEY `idx_contact_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_messages`
--

LOCK TABLES `contact_messages` WRITE;
/*!40000 ALTER TABLE `contact_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_preferences`
--

DROP TABLE IF EXISTS `customer_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_preferences` (
  `customer_id` bigint(20) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`customer_id`,`category_id`),
  KEY `fk_customer_preferences_category` (`category_id`),
  CONSTRAINT `fk_customer_preferences_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_customer_preferences_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_preferences`
--

LOCK TABLES `customer_preferences` WRITE;
/*!40000 ALTER TABLE `customer_preferences` DISABLE KEYS */;
INSERT INTO `customer_preferences` VALUES (1,1),(1,3),(1,4),(1,5);
/*!40000 ALTER TABLE `customer_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `email` varchar(190) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `password_hash` varchar(255) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `municipality` varchar(120) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'Ribeiro Gomes','gomesribeiro1228@gmail.com','939530735','2026-10-23 18:03:26','scrypt$bkctAauKL69JsrHOGB3zGQ$7fkQ-khZhlbB9o1v5vup4xeZ5ejoueay4NjEVoxH-DWeTbMFF1vYpgW9Eh4vrPYufGjmynpVHJzoOZcxR2nOSQ','Luanda','Talatona');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `product_name` varchar(200) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `quantity` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `fk_order_items_products` (`product_id`),
  CONSTRAINT `fk_order_items_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_products` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,4,'Whey Protein Isolado',28000.00,1),(2,1,6,'Top Esportivo Alça Dupla',14000.00,1);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `order_number` varchar(40) NOT NULL,
  `status` enum('PENDING','PAYMENT_PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','FAILED','RESERVED') NOT NULL DEFAULT 'PENDING',
  `payment_method` enum('EMIS','CASH') NOT NULL DEFAULT 'EMIS',
  `subtotal` decimal(12,2) NOT NULL,
  `delivery_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL,
  `delivery_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`delivery_address`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `order_type` enum('PURCHASE','RESERVATION') NOT NULL DEFAULT 'PURCHASE',
  `reservation_expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_number` (`order_number`),
  KEY `idx_orders_customer` (`customer_id`),
  KEY `idx_orders_status` (`status`),
  CONSTRAINT `fk_orders_customers` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,'APX-1792775172100-CUJ3EN','PENDING','EMIS',42000.00,0.00,42000.00,'{}','2026-10-23 18:06:12','2026-10-23 18:06:12','PURCHASE',NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'EMIS',
  `transaction_id` varchar(160) DEFAULT NULL,
  `reference` varchar(160) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'AOA',
  `status` enum('PENDING','APPROVED','FAILED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `response_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_data`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_payments_order` (`order_id`),
  KEY `idx_payments_provider_transaction` (`provider`,`transaction_id`),
  CONSTRAINT `fk_payments_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_reviews`
--

DROP TABLE IF EXISTS `product_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_reviews` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `rating` tinyint(3) unsigned NOT NULL,
  `comment` varchar(1000) NOT NULL,
  `approved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_reviews_product` (`product_id`),
  KEY `idx_reviews_customer` (`customer_id`),
  CONSTRAINT `fk_reviews_customers` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_products` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_reviews`
--

LOCK TABLES `product_reviews` WRITE;
/*!40000 ALTER TABLE `product_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int(10) unsigned NOT NULL,
  `name` varchar(200) NOT NULL,
  `slug` varchar(240) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `stock` int(10) unsigned NOT NULL DEFAULT 0,
  `image_url` varchar(500) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_active_featured` (`active`,`featured`),
  CONSTRAINT `fk_products_categories` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,2,'Leggings de Alta Compressão Pro','leggings-alta-compressao-pro','Tecido respirável com elasticidade em quatro direções.',18500.00,24,'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',1,1,'2026-10-23 11:11:13','2026-10-23 11:11:13'),(2,1,'Camiseta Dry-Fit Athletic','camiseta-dry-fit-athletic','Tecnologia antitranspirante para treinos de alta intensidade.',12000.00,40,'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80',1,1,'2026-10-23 11:11:13','2026-10-23 11:11:13'),(3,3,'Halter Ajustável Profissional','halter-ajustavel-profissional','Halter de 24 kg com ajuste rápido por seletor giratório.',55000.00,12,'https://images.unsplash.com/photo-1574680096145-1e2ca3e2e4b4?auto=format&fit=crop&w=900&q=80',1,1,'2026-10-23 11:11:13','2026-10-23 11:11:13'),(4,4,'Whey Protein Isolado','whey-protein-isolado','Proteína de alta pureza com 27 g por porção.',28000.00,17,'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=900&q=80',1,1,'2026-10-23 11:11:13','2026-10-23 18:06:12'),(5,5,'Straps e Munhequeira de Couro','straps-munhequeira-couro','Suporte reforçado para levantamento de peso.',8500.00,35,'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',1,1,'2026-10-23 11:11:13','2026-10-23 11:11:13'),(6,2,'Top Esportivo Alça Dupla','top-esportivo-alca-dupla','Suporte de alto impacto com bojo removível.',14000.00,29,'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',1,0,'2026-10-23 11:11:13','2026-10-23 18:06:12');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-23 18:24:40
