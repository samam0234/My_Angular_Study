import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

@Pipe({ name: 'formatInstant' })
export class FormatInstantPipe implements PipeTransform {
  transform(
    value: Date | number | string | null | undefined,
    pattern = 'yyyy-MM-dd HH:mm',
  ): string {
    if (value == null || value === '') {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return format(date, pattern, { locale: ko });
  }
}
