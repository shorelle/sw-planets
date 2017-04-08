/* 
 * Javascript Initialiser
 * ========================================================================== */

import swapi from 'sw-api-js';
import Theme from './modules/theme';
import Util from './modules/util';

jQuery(document).ready( ($) => {

  // JS enabled
  $('html').removeClass('no-js');

  // Create stars
  Theme.stars();

  // Set up tweet button
  Util.tweet('twitter', 'shorelle');

  // Get planets
  swapi('planets').then( data => {

    // Ready state
    $('#planets').addClass('active');
    $('.loading').removeClass('active');
    $('header, footer').delay(2000).addClass('active');

    const HEIGHT = 700,
          WIDTH = HEIGHT * 1.4;
    let maxRadius = 0,
        minRadius = Number.MAX_VALUE;

    /*
     * Get planet data from SWAPI
     */
    let nodes = data.filter( planet => {
                      return (planet.diameter !== 'unknown' && planet.diameter > 0);
                    }).map( planet => {
                      // linear scale
                      planet.nodeRadius = planet.diameter / 1500;
                      // get max and min radius
                      if ( planet.nodeRadius > maxRadius ) maxRadius = planet.nodeRadius;
                      if ( planet.nodeRadius < minRadius ) minRadius = planet.nodeRadius;
                      // set primary climate and terrain
                      planet.nodeClimate = planet.climate.split(' ').slice(-1)[0];
                      planet.nodeTerrain = planet.terrain.split(' ').slice(-1)[0];

                      return planet;
                    });

    // Shuffle planets
    Util.shuffleArray(nodes); 

    /*
     * Scale circles and cluster
     */
    let padding = 30,
        clusterPadding = 30,
        clusters = {},
        scaleSqrt = d3.scaleSqrt()
                      .domain([1, 100000])
                      .range([minRadius, maxRadius]);

    maxRadius = scaleSqrt(maxRadius);
    nodes = nodes.map( planet => {
      planet.nodeRadius = scaleSqrt(planet.diameter);
      // get unique climates
      if (typeof clusters[planet.nodeClimate] !== 'undefined') {
        if (planet.diameter > clusters[planet.nodeClimate].diameter) {
          clusters[planet.nodeClimate] = planet;
        }
      } else {
        clusters[planet.nodeClimate] = planet;
      }
      return planet;
    });

    /*
     * Set up SVG
     */
    let svg = d3.select('svg')
                  .attr('preserveAspectRatio', 'xMinYMin meet')
                  .attr('viewBox', '0 0 ' + WIDTH + ' ' + HEIGHT);

    let g = svg.append('g');

    let planets = g.selectAll('g.planet')
                      .data(nodes, d => d.diameter)
                    .enter().append('g')
                      .attr('class', 'planet')
                      .on('click', clicked);

    let circles = planets.append('circle')
                          .attr('r', d => d.nodeRadius)
                          .attr('id', d => Util.slugify(d.name))
                          .attr('class', d => d.climate.replace(/,/g, '') + ' ' + d.terrain.replace(/,/g, ''))
                          .attr('transform', () => 'rotate(' + Math.random()*360 + ')')
                          .attr('fill', d => 'url(#' + Util.slugify(d.name) + ')' )

        planets.append('text')
                          .attr('text-anchor', 'middle')
                          .attr('dy', () => '0.35em')
                          .text(d => d.name);

    // Force layout simulation
    let simulation = d3.forceSimulation(nodes)
                          .velocityDecay(0.2)
                          .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
                          .force('x', d3.forceX().strength(0.005))
                          .force('y', d3.forceY().strength(0.005))
                          .force('collide', d3.forceCollide( d => d.nodeRadius + padding ).strength(0))
                          .force('cluster', clustering)
                          .on('tick', ticked);

    // Ramp up collision strength to provide smooth transition
    let transitionTime = 3000;
    let t = d3.timer( elapsed => {
      let dt = elapsed / transitionTime;
      simulation.force('collide').strength(Math.pow(dt, 2) * 0.7);
      if (dt >= 1.0) t.stop();
    });

    /*
     * Animate circles
     */
    function ticked() {
      circles.attr('r', d => d.nodeRadius);

      planets.attr('transform', d => {
        let diameter = d.nodeRadius * 2;
        d.x = Math.max(diameter, Math.min(WIDTH - diameter, d.x));
        d.y = Math.max(diameter, Math.min(HEIGHT - diameter, d.y));
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    }

    /*
     * Clustering functions
     */
    function clustering(alpha) {
      nodes.forEach(function(d) {
        var cluster = clusters[d.nodeClimate];
        if (cluster === d) return;
        var x = d.x - cluster.x,
          y = d.y - cluster.y,
          l = Math.sqrt(x * x + y * y),
          r = d.nodeRadius + cluster.nodeRadius;
        if (l !== r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          cluster.x += x;
          cluster.y += y;
        }  
      });
    }

    /*
     * Zooming and panning functions
     */
    let card = $('.planet-detail');
    let active = d3.select(null);
    let zoom = d3.zoom()
                .on('zoom', zoomed);
    let pan = d3.zoom()
                .scaleExtent([1,1])
                .on('zoom', zoomed)
                .on('start', zoomStarted)
                .on('end', zoomEnded);
    let initialTransform = d3.zoomIdentity
                            .translate(0,0)
                            .scale(1);
    svg.call(pan);

    /*
     * Set active planet on click
     */
    function clicked(d) {
      if (active.node() === this) return reset();

      $('header, footer').removeClass('active');
      populatePlanet(d);
      planets.classed('inactive', true);
      active.classed('active', false);
      active = d3.select(this)
                  .classed('active', true)
                  .classed('inactive', false);

      let scale = d.nodeRadius > 40 ? 2 : 3;
      let transform = d3.zoomIdentity
        .translate(WIDTH / 4 - scale * d.x, HEIGHT / 3 - scale * d.y)
        .scale(scale);

      svg.transition()
          .duration(750)
          .call(zoom.transform, transform);
    }

    /*
     * Reset to galaxy map
     */
    function reset() {
      $('header, footer').addClass('active');
      card.removeClass('active');
      planets.classed('inactive', false);
      active.classed('active', false);
      active = d3.select(null);

      svg.transition()
          .duration(750)
          .call(zoom.transform, initialTransform);
    }

    /*
     * Bind reset to escape key and back link
     */
    $(document).keyup( function(e) {
      if (e.keyCode === 27) {
        reset();
      }
    });

    $('a.reset').click( function(e) {
      e.preventDefault();
      reset();
    });

    /*
     * Zoom helper functions
     */
    function zoomed() {
      g.attr('transform', d3.event.transform);
    }

    function zoomStarted() {
      simulation.alphaTarget(0.05).restart();
    }

    function zoomEnded() {
      simulation.alphaTarget(0);
    }

    /*
     * Toggle functions
     */
     $('a.cluster').on('click', event => {
        event.preventDefault();
        simulation = d3.forceSimulation(nodes)
                        .velocityDecay(0.2)
                        .force('center', d3.forceCenter(WIDTH/2, HEIGHT/2))
                        .force('x', d3.forceX().strength(0.0005))
                        .force('y', d3.forceY().strength(0.0005))
                        .force('collide', collide)
                        .force('cluster', clustering)
                        .on('tick', ticked);
     });

    /*
     * Custom collision
     */
    function collide(alpha) {
      var quadtree = d3.quadtree()
          .x( d => d.x)
          .y( d => d.y)
          .addAll(nodes);

      nodes.forEach( d => {
        var r = d.nodeRadius + maxRadius + Math.max(padding, clusterPadding),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;

        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.data && (quad.data !== d)) {
            var x = d.x - quad.data.x,
                y = d.y - quad.data.y,
                l = Math.sqrt(x * x + y * y),
                r = d.nodeRadius + quad.data.nodeRadius + (d.cluster === quad.data.cluster ? padding : clusterPadding);
            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.data.x += x;
              quad.data.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      });
    }

    /*
     * Fill in active planet details
     */
    function populatePlanet(d) {
      card.find('h2').text(d.name);
      card.find('.climate .value').text(d.climate);
      card.find('.gravity .value').text(d.gravity);
      card.find('.terrain .value').text(d.terrain);
      card.find('.population .value').text(Util.formatNumber(d.population));
      card.find('.rotation .value').text(Util.formatNumber(d.rotation_period));
      card.find('.orbital .value').text(Util.formatNumber(d.orbital_period));
      card.find('.diameter .value').text(Util.formatNumber(d.diameter));
      card.find('.planet-link a').attr('href', 'http://starwars.wikia.com/wiki/' + d.name);
      card.addClass('active');
    }

  }).catch( err => {
    $('.error').text('Sorry, something went wrong!').addClass('active');
    console.log(err);
  });

});