use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // user_id
    pub email: String,      // user email
    pub username: String,   // username
    pub is_admin: bool,     // admin flag
    pub exp: i64,           // expiration time
    pub iat: i64,           // issued at
}

pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
        }
    }

    /// Generate JWT token for user
    /// Token expires in 7 days by default
    pub fn generate_token(
        &self,
        user_id: &str,
        email: &str,
        username: &str,
        is_admin: bool,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let exp = now + Duration::days(7);

        let claims = Claims {
            sub: user_id.to_string(),
            email: email.to_string(),
            username: username.to_string(),
            is_admin,
            exp: exp.timestamp(),
            iat: now.timestamp(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
    }

    /// Validate and decode JWT token
    pub fn validate_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let token_data = decode::<Claims>(
            token,
            &self.decoding_key,
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_generation_and_validation() {
        let jwt_service = JwtService::new("test_secret_key_12345");
        let user_id = Uuid::new_v4();
        let user_id_str = user_id.to_string();

        let token = jwt_service
            .generate_token(&user_id_str, "test@example.com", "testuser", false)
            .unwrap();

        let claims = jwt_service.validate_token(&token).unwrap();

        assert_eq!(claims.sub, user_id_str);
        assert_eq!(claims.email, "test@example.com");
        assert_eq!(claims.username, "testuser");
        assert_eq!(claims.is_admin, false);
    }
}
