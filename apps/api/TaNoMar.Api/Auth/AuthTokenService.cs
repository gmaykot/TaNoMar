using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TaNoMar.Api.Data;
using TaNoMar.Api.Options;

namespace TaNoMar.Api.Auth;

public sealed class AuthTokenService(IConfiguration configuration, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options)
{
    private readonly TaNoMarOptions _options = options.Value;

    public string IssueAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetKey()));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };
        var token = new JwtSecurityToken(_options.JwtIssuer, _options.JwtIssuer, claims, expires: DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes), signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    public string HashRefreshToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    public string GetKey()
    {
        var key = string.IsNullOrWhiteSpace(_options.JwtKey) ? configuration["JWT_KEY"] : _options.JwtKey;
        return !string.IsNullOrWhiteSpace(key)
            ? key
            : throw new InvalidOperationException("TaNoMar__JwtKey/JWT_KEY precisa ser configurado.");
    }
}
