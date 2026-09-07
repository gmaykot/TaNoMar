using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class VisibleMetricsPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VisibleMetrics",
                table: "UserPreferences",
                type: "text",
                nullable: false,
                defaultValue: "wind,gusts,waves,wave-period,swell,rain,air-temperature,water-temperature");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VisibleMetrics",
                table: "UserPreferences");
        }
    }
}
