using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBillingCancellationOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AccountDeletionReceiptId",
                table: "BillingCancellations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LeaseExpiresAt",
                table: "BillingCancellations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LeaseOwner",
                table: "BillingCancellations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AccountDeletionReceipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProtocolHash = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RemoteSubscriptionCount = table.Column<int>(type: "integer", nullable: false),
                    AccountDeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetainUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountDeletionReceipts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingCancellations_LeaseExpiresAt",
                table: "BillingCancellations",
                column: "LeaseExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_AccountDeletionReceipts_ProtocolHash",
                table: "AccountDeletionReceipts",
                column: "ProtocolHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AccountDeletionReceipts_RetainUntil",
                table: "AccountDeletionReceipts",
                column: "RetainUntil");

            // PreviousAsaasSubscriptionId só representa uma troca consumada quando o checkout
            // substituto chegou a um período pago. Checkouts pending/expired sem PeriodStart são
            // abandonados e não autorizam cancelar a assinatura anterior ainda legítima.
            migrationBuilder.Sql(
                """
                WITH paid_replacements AS (
                    SELECT DISTINCT ON ("PreviousAsaasSubscriptionId")
                        "UserId",
                        "Id" AS "BillingSubscriptionId",
                        "PreviousAsaasSubscriptionId" AS "RemoteId"
                    FROM "BillingSubscriptions"
                    WHERE "PreviousAsaasSubscriptionId" IS NOT NULL
                      AND "PreviousAsaasSubscriptionId" <> COALESCE("AsaasSubscriptionId", '')
                      AND "AsaasSubscriptionId" IS NOT NULL
                      AND "PeriodStart" IS NOT NULL
                      AND "CurrentPeriodEnd" IS NOT NULL
                      AND "Status" IN ('active', 'past_due', 'canceled', 'expired')
                    ORDER BY "PreviousAsaasSubscriptionId", "UpdatedAt" DESC, "CreatedAt" DESC
                )
                INSERT INTO "BillingCancellations" (
                    "Id", "UserId", "BillingSubscriptionId", "AsaasSubscriptionId", "Reason", "Status",
                    "AttemptCount", "NextAttemptAt", "ConcurrencyToken", "CreatedAt", "UpdatedAt")
                SELECT
                    md5("RemoteId" || ':billing-upgrade-reconciliation')::uuid,
                    "UserId",
                    "BillingSubscriptionId",
                    "RemoteId",
                    'legacy_reconciliation',
                    'pending',
                    0,
                    NOW(),
                    md5("RemoteId" || ':billing-upgrade-reconciliation-concurrency')::uuid,
                    NOW(),
                    NOW()
                FROM paid_replacements
                ON CONFLICT ("AsaasSubscriptionId") DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountDeletionReceipts");

            migrationBuilder.DropIndex(
                name: "IX_BillingCancellations_LeaseExpiresAt",
                table: "BillingCancellations");

            migrationBuilder.DropColumn(
                name: "AccountDeletionReceiptId",
                table: "BillingCancellations");

            migrationBuilder.DropColumn(
                name: "LeaseExpiresAt",
                table: "BillingCancellations");

            migrationBuilder.DropColumn(
                name: "LeaseOwner",
                table: "BillingCancellations");
        }
    }
}
