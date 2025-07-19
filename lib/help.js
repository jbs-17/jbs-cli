import figlet from 'figlet';
import chalk from 'chalk';

figlet.text('Hello World!', {
  font: 'Bulbhead',
}, (err, data) => {
  if (err) return console.error(err);
  console.log(chalk.red(data));
});
