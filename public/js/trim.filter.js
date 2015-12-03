app.filter('numberTrim', [function() {
  return function(input) {
    console.log(input);
    return (input == 0) ? 0 : input.replace(/^0+/, '');
  };
}]);
