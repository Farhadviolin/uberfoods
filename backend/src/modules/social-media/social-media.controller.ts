import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  SocialMediaService,
  CreateSocialPostDto,
  UpdateSocialPostDto,
} from "./social-media.service";

@Controller("social-media")
export class SocialMediaController {
  constructor(private readonly socialMediaService: SocialMediaService) {}

  @Get()
  async findAll(
    @Query("restaurantId") restaurantId?: string,
    @Query("platform") platform?: string,
    @Query("status") status?: string,
  ) {
    return this.socialMediaService.findAll(restaurantId, platform, status);
  }

  @Get("stats")
  async getStats(@Query("restaurantId") restaurantId?: string) {
    return this.socialMediaService.getStats(restaurantId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.socialMediaService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreateSocialPostDto) {
    return this.socialMediaService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: UpdateSocialPostDto) {
    return this.socialMediaService.update(id, data);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    return this.socialMediaService.delete(id);
  }

  @Post(":id/publish")
  async publish(@Param("id") id: string) {
    return this.socialMediaService.publish(id);
  }

  @Post("sync")
  async syncAll(@Query("restaurantId") restaurantId?: string) {
    return this.socialMediaService.syncAll(restaurantId);
  }
}
