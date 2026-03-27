import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "postgres",
      port: 5432,
      username: "postgres",
      password: "password",
      database: process.env.DB_NAME || "event_driven_system",
      // autoLoadEntities can miss entities depending on module import order
      // in Nest. Provide an explicit entities glob so tables are created
      // reliably during app bootstrap.
      entities: [__dirname + "/../**/*.entity{.ts,.js}"],
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
})
export class DatabaseModule {}
