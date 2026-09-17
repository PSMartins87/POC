FROM eclipse-temurin:25-jdk-alpine

RUN apk add --no-cache bash

WORKDIR /app

COPY . .

RUN chmod +x mvnw

CMD ["./mvnw", "spring-boot:run"]