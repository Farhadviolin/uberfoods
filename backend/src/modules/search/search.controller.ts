import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SearchService } from "./search.service";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("autocomplete")
  @ApiOperation({ summary: "Autocomplete search" })
  @ApiResponse({ status: 200, description: "Suggestions retrieved" })
  async autocomplete(@Query("q") query = "") {
    const suggestions = await this.searchService.getAutocomplete(query);
    return { suggestions };
  }

  @Get("popular")
  @ApiOperation({ summary: "Popular searches" })
  @ApiResponse({ status: 200, description: "Popular searches retrieved" })
  getPopular() {
    return [];
  }

  @Post("intelligent")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Intelligent search" })
  @ApiResponse({ status: 201, description: "Search performed" })
  async intelligent(@Body() body: { query: string }) {
    return this.searchService.intelligentSearch(body.query || "");
  }

  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Search history" })
  @ApiResponse({ status: 200, description: "History retrieved" })
  getHistory() {
    return { history: [], total: 0 };
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Search suggestions" })
  @ApiResponse({ status: 200, description: "Suggestions retrieved" })
  async suggestions(@Query("q") query = "") {
    const suggestions = await this.searchService.getAutocomplete(query);
    return { suggestions };
  }
}
