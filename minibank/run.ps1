$env:APP_JWT_SECRET="This_is_a_super_long_secret_key_for_JWT_signing_please_change_me_1234567890_ABCDEFGHIJKLMNOPQRSTUVWXYZ"
$env:APP_JWT_EXP_MINUTES="120"

$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/minibank"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="1234"

$env:RESEND_API_KEY="re_g6g4HjCP_6dQQoCkmpgYmuS1oTtgu6XAF"
$env:RESEND_FROM="no-reply@minibank.online"

./mvnw spring-boot:run
