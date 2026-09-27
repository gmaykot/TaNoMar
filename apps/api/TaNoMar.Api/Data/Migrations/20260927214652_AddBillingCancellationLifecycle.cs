using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBillingCancellationLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BillingCancellations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BillingSubscriptionId = table.Column<Guid>(type: "uuid", nullable: true),
                    AsaasSubscriptionId = table.Column<string>(type: "text", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    LastFailureCode = table.Column<string>(type: "text", nullable: true),
                    LastAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConfirmedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ActionRequiredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetainUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    NotificationSentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConcurrencyToken = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingCancellations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingCancellations_AsaasSubscriptionId",
                table: "BillingCancellations",
                column: "AsaasSubscriptionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BillingCancellations_Status_NextAttemptAt",
                table: "BillingCancellations",
                columns: new[] { "Status", "NextAttemptAt" });

            // Versões anteriores marcavam cancelamento local mesmo quando o DELETE do Asaas falhava.
            // Reconciliar esses vínculos preservados evita que uma recorrência antiga continue ativa.
            migrationBuilder.Sql(
                """
                INSERT INTO "BillingCancellations" (
                    "Id", "UserId", "BillingSubscriptionId", "AsaasSubscriptionId", "Reason", "Status",
                    "AttemptCount", "NextAttemptAt", "ConcurrencyToken", "CreatedAt", "UpdatedAt")
                SELECT
                    "Id", "UserId", "Id", "AsaasSubscriptionId", 'legacy_reconciliation', 'pending',
                    0, NOW(), "Id", NOW(), NOW()
                FROM "BillingSubscriptions"
                WHERE "AsaasSubscriptionId" IS NOT NULL
                  AND ("Status" = 'canceled' OR "CancelAtPeriodEnd" = TRUE)
                ON CONFLICT ("AsaasSubscriptionId") DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BillingCancellations");
        }
    }
}
