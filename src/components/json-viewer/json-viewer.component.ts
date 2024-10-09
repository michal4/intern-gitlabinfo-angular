import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'jsonColor',
  standalone: true
})
export class JsonColorPipe implements PipeTransform {

  transform(value: any): any {
    if (!value) {
      return '';
    }
    
    const json = JSON.stringify(value, undefined, 2);

    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|a)/g,
      (match) => {
        let color = 'darkorange'; // Default color for numbers

        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            color = 'red'; // Keys
          } else {
            color = 'green'; // String values
          }
        } else if (/true|false/.test(match)) {
          color = 'blue'; // Booleans
        } else if (/null/.test(match)) {
          color = 'magenta'; // Null
        } else if (/a/.test(match)) {
          color = 'purple'; // Color for 'a'
        }

        return `<span style="color: ${color};">${match}</span>`;
      }
    );
  }
}
