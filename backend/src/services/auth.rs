use oauth2::{
    AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl,
    basic::BasicClient,
};
use anyhow::Result;

pub struct OAuthConfig {
    pub google_client: BasicClient,
    pub wechat_client: BasicClient,
}

impl OAuthConfig {
    pub fn new(
        google_client_id: String,
        google_client_secret: String,
        google_redirect_uri: String,
        wechat_app_id: String,
        wechat_app_secret: String,
        wechat_redirect_uri: String,
    ) -> Result<Self> {
        // Google OAuth client
        let google_client = BasicClient::new(
            ClientId::new(google_client_id),
            Some(ClientSecret::new(google_client_secret)),
            AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())?,
            Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string())?),
        )
        .set_redirect_uri(RedirectUrl::new(google_redirect_uri)?);

        // WeChat OAuth client
        let wechat_client = BasicClient::new(
            ClientId::new(wechat_app_id),
            Some(ClientSecret::new(wechat_app_secret)),
            AuthUrl::new("https://open.weixin.qq.com/connect/qrconnect".to_string())?,
            Some(TokenUrl::new("https://api.weixin.qq.com/sns/oauth2/access_token".to_string())?),
        )
        .set_redirect_uri(RedirectUrl::new(wechat_redirect_uri)?);

        Ok(OAuthConfig {
            google_client,
            wechat_client,
        })
    }
}
