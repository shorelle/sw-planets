/* 
 * Module - Utils
 * ========================================================================== */

/*
 * Get slug
 */
function slugify(string) {
  const a = 'àáäâèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;';
  const b = 'aaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return string.toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(p, c =>
        b.charAt(a.indexOf(c)))     // Replace special chars
    .replace(/&/g, '-and-')         // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '')             // Trim - from end of text
}

/*
 * Get circle offset
 */
function circleOffset(offset, range) {
  return (Math.random() * (range - (offset * 2))) + offset;
}

/*
 * Shuffle the array
 */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

/*
 * Format number
 */
function formatNumber(string) {
  let number = Number(string);

  if (isNaN(number)) {
    return 'Unknown';
  } else {
    return Number(number).toLocaleString('en-US');
  }
}

/*
 * Bind tweet
 */
function tweet(id, username) {
  let tweet = document.getElementById(id);

  tweet.href = 'https://twitter.com/share?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title + ' | @' + username);

  tweet.addEventListener('click', function(event) {
    event.preventDefault();
    const width = 600,
          height = 300,
          left = (screen.width / 2) - (width / 2),
          top = (screen.height / 2) - (height / 2);
    window.open(
      tweet.href,
      'tweetWindow',
      'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
    );
  }, false);
}

export default { 
  slugify, 
  circleOffset, 
  shuffleArray, 
  formatNumber, 
  tweet
}