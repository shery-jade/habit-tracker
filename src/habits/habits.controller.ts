import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private habitsService: HabitsService) {}

  @Get()
  findAll(@Request() req) {
    return this.habitsService.findAll(req.user);
  }

  @Post()
  create(@Request() req, @Body() body: { name: string; description?: string }) {
    return this.habitsService.create(req.user, body.name, body.description);
  }

  @Put(':id')
  update(@Param('id') id: number, @Request() req, @Body() body: { name?: string; description?: string }) {
    return this.habitsService.update(+id, req.user, body.name, body.description);
  }

  @Delete(':id')
  delete(@Param('id') id: number, @Request() req) {
    return this.habitsService.delete(+id, req.user);
  }

  @Post(':id/complete')
  complete(@Param('id') id: number, @Request() req) {
    return this.habitsService.complete(+id, req.user);
  }
}