export function textColor(backgroundColor: string) {
  if(!backgroundColor || 0 === backgroundColor.length) {
    return '#000000';
  } else {
    let input = backgroundColor.toString().replace('#', '');
    if(input.length != 6) {
      return '#000000';
    } else {
      let red = parseInt(input.substr(0,2), 16);
      let green = parseInt(input.substr(2,2), 16);
      let blue = parseInt(input.substr(4,2), 16);
      // Luminance values for different hues are not equal.
      let greyscale = red * 0.299 + green * 0.587 + blue * 0.114;
      // Perceived midpoint for grey is higher than 128. (around 186)
      let midpoint = 152;
      return (greyscale > midpoint) ? '#000000' : '#ffffff';
    }
  }
}
