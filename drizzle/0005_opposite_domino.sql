ALTER TABLE `pedidos` MODIFY COLUMN `status` enum('ativo','concluido','cancelado','encerrado') NOT NULL DEFAULT 'ativo';--> statement-breakpoint
ALTER TABLE `pedidos` ADD `pedidoOrigemId` int;