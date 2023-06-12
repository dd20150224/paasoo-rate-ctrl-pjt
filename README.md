# Context
It is part of project "Paasoo Rate Control".
The project is dividied into two parts:
1. paasoo-rate-ctl-pjt (for local testing)
2. paasoo-rate-ctl-pjt-lambda (for deployment to lambda in AWS)

## PROCEDURES

1. Install NPM modules

``` shell
~/$ yarn install
```

2. Prepare .env

``` javascript
PORT=
DYNAMODB_MESSAGE_LOG_TABLE=
DYNAMODB_CONFIG_TABLE=
DYNAMODB_SYSTEM_SETTING_TABLE=
PAASOO_API_URL=
PAASOO_KEY=
PAASOO_SECRET=
PAASOO_FROM=
```

3. Execute

``` shell
~/$ yarn dev
```
