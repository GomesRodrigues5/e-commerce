USE apexfit;

INSERT INTO categories (id, name, slug) VALUES
(1, 'Homens', 'homens'),
(2, 'Mulheres', 'mulheres'),
(3, 'Pesos', 'pesos'),
(4, 'Suplementos', 'suplementos'),
(5, 'Acessórios', 'acessorios')
ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug);

INSERT IGNORE INTO angola_provinces (name) VALUES
('Bengo'), ('Benguela'), ('Bié'), ('Cabinda'), ('Cuando'), ('Cubango'),
('Cuanza Norte'), ('Cuanza Sul'), ('Cunene'), ('Huambo'), ('Huíla'),
('Icolo e Bengo'), ('Luanda'), ('Lunda Norte'), ('Lunda Sul'), ('Malanje'),
('Moxico'), ('Moxico Leste'), ('Namibe'), ('Uíge'), ('Zaire');

INSERT INTO products (category_id, name, slug, description, price, stock, image_url, active, featured) VALUES
(2, 'Leggings de Alta Compressão Pro', 'leggings-alta-compressao-pro', 'Tecido respirável com elasticidade em quatro direções.', 18500, 24, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80', TRUE, TRUE),
(1, 'Camiseta Dry-Fit Athletic', 'camiseta-dry-fit-athletic', 'Tecnologia antitranspirante para treinos de alta intensidade.', 12000, 40, 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80', TRUE, TRUE),
(3, 'Halter Ajustável Profissional', 'halter-ajustavel-profissional', 'Halter de 24 kg com ajuste rápido por seletor giratório.', 55000, 12, 'https://images.unsplash.com/photo-1574680096145-1e2ca3e2e4b4?auto=format&fit=crop&w=900&q=80', TRUE, TRUE),
(4, 'Whey Protein Isolado', 'whey-protein-isolado', 'Proteína de alta pureza com 27 g por porção.', 28000, 18, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=900&q=80', TRUE, TRUE),
(5, 'Straps e Munhequeira de Couro', 'straps-munhequeira-couro', 'Suporte reforçado para levantamento de peso.', 8500, 35, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80', TRUE, TRUE),
(2, 'Top Esportivo Alça Dupla', 'top-esportivo-alca-dupla', 'Suporte de alto impacto com bojo removível.', 14000, 30, 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80', TRUE, FALSE)
ON DUPLICATE KEY UPDATE category_id = VALUES(category_id), price = VALUES(price), stock = VALUES(stock);
