/* 
 * Module - Theme
 * ========================================================================== */

/*
 * Set up stars
 */
function stars() {
  let stars = document.getElementById('stars');

  for (let i = 0; i < 100; ++i) {
    let star = document.createElement('div');
    star.className = 'star';
    stars.appendChild(star);
  }
}

export default { stars }