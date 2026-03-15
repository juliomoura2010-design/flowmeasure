CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`email` varchar(320),
	`telefone` varchar(30),
	`endereco` text,
	`cidade` varchar(100),
	`estado` varchar(2),
	`cep` varchar(10),
	`contato` varchar(255),
	`status` enum('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(50) NOT NULL,
	`pedidoId` int NOT NULL,
	`mes` varchar(7) NOT NULL,
	`valor` decimal(15,2) NOT NULL,
	`dataEmissao` date,
	`dataPagamento` date,
	`status` enum('pendente','paga','cancelada') NOT NULL DEFAULT 'pendente',
	`numeroPagamento` varchar(100),
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(50) NOT NULL,
	`fornecedorId` int NOT NULL,
	`descricao` text,
	`valor` decimal(15,2) NOT NULL,
	`dataInicio` date,
	`dataFim` date,
	`tipoGasto` enum('capex','opex') NOT NULL DEFAULT 'opex',
	`frequencia` enum('mensal','trimestral','semestral','anual') NOT NULL DEFAULT 'mensal',
	`status` enum('ativo','concluido','cancelado') NOT NULL DEFAULT 'ativo',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_id` PRIMARY KEY(`id`)
);
