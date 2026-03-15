ALTER TABLE `fornecedores` ADD `categoria` varchar(100);--> statement-breakpoint
ALTER TABLE `medicoes` ADD `dataVencimento` date;--> statement-breakpoint
ALTER TABLE `pedidos` ADD `tipo` enum('fixo','mensal') DEFAULT 'mensal' NOT NULL;--> statement-breakpoint
ALTER TABLE `pedidos` ADD `totalMedicoes` int DEFAULT 12;