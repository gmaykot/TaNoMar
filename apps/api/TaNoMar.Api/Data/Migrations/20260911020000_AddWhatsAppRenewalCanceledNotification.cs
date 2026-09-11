using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    [DbContext(typeof(TaNoMarDbContext))]
    [Migration("20260911020000_AddWhatsAppRenewalCanceledNotification")]
    public partial class AddWhatsAppRenewalCanceledNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NotifyRenewalCanceled",
                table: "WhatsAppSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotifyRenewalCanceled",
                table: "WhatsAppSettings");
        }
    }
}
