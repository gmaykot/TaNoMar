using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBillingSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BillingCustomers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AsaasCustomerId = table.Column<string>(type: "text", nullable: false),
                    CpfCnpj = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingCustomers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BillingSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanCode = table.Column<string>(type: "text", nullable: false),
                    Cycle = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AsaasCheckoutId = table.Column<string>(type: "text", nullable: true),
                    AsaasSubscriptionId = table.Column<string>(type: "text", nullable: true),
                    PreviousAsaasSubscriptionId = table.Column<string>(type: "text", nullable: true),
                    CheckoutUrl = table.Column<string>(type: "text", nullable: true),
                    PriceCents = table.Column<int>(type: "integer", nullable: false),
                    RecurringPriceCents = table.Column<int>(type: "integer", nullable: false),
                    ExternalReference = table.Column<string>(type: "text", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PeriodStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CurrentPeriodEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PastDueSince = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CancelAtPeriodEnd = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BillingWebhookEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AsaasEventId = table.Column<string>(type: "text", nullable: false),
                    Event = table.Column<string>(type: "text", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingWebhookEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingCustomers_AsaasCustomerId",
                table: "BillingCustomers",
                column: "AsaasCustomerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BillingCustomers_UserId",
                table: "BillingCustomers",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BillingSubscriptions_AsaasCheckoutId",
                table: "BillingSubscriptions",
                column: "AsaasCheckoutId");

            migrationBuilder.CreateIndex(
                name: "IX_BillingSubscriptions_AsaasSubscriptionId",
                table: "BillingSubscriptions",
                column: "AsaasSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_BillingSubscriptions_UserId",
                table: "BillingSubscriptions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BillingWebhookEvents_AsaasEventId",
                table: "BillingWebhookEvents",
                column: "AsaasEventId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BillingCustomers");

            migrationBuilder.DropTable(
                name: "BillingSubscriptions");

            migrationBuilder.DropTable(
                name: "BillingWebhookEvents");
        }
    }
}
