'use strict';

(function() {

  let data = "";
  let svgLineGraph = "";
  let svgTooltip = "";
  let selectedCountry = "";
  let tooltipDiv = "";

  // load data and make the plot
  window.onload = function() {
    svgLineGraph = d3.select('body')
      .append('svg')
      .attr('width', 800)
      .attr('height', 600);

    // d3.csv is basically fetch but it can be be passed a csv file as a parameter
    d3.csv("./data/dataEveryYear.csv")
      .then((csvData) => {
        data = csvData;

        // Create an object to hold all of the unique countries
        let countries = [];

        // Loop through and get the unique values for the year
        data.forEach(row => {
          let country = (row["location"])
          if (countries.indexOf(country) == -1) {
            countries.push(country)
          }
        });

        // Sort so that the dropdown is alphabetical
        countries.sort()
        selectedCountry = countries[0];

        // Create a dropdown menu
        addDropdown(countries);
        makeLineGraph();

        tooltipDiv = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("opacity", 0)

        svgTooltip = tooltipDiv.append('svg')
          .attr('width', 350)
          .attr('height', 260);

        makeScatterPlot();
      });
  }

  // Adds the dropdown menu with the years onto the svg
  function addDropdown(country_data) {

    // Append the dropdown to the SVG
    let dropdown = d3.select('select')

    // Append the options to the dropdown
    dropdown.selectAll('option')
      .data(country_data).enter()
      .append('option')
        .text(d => d)
        
    // Remove current points and redraw the scatter plot
    dropdown.on('change', function(){
      selectedCountry = d3.select('select').property('value');
      makeLineGraph();
    });

  }

  // Make line graph based on the chosen country
  function makeLineGraph() {

    // Clear the current html body
    svgLineGraph.html("");

    // Filter data for the country selected
    let countryData = data.filter((row) => row["location"] == selectedCountry);

    // Get years for the country selected
    let timeData = countryData.map((row) => row["time"]);

    // Get population data for the country selected
    let populationData = countryData.map((row) => parseFloat(row["pop_mlns"]));

    // Get min/max values for the time and population
    let minMax = findMinMax(timeData, populationData)

    // Create the axes
    let funcs = drawAxes(minMax, "time", "pop_mlns", svgLineGraph, {min: 100, max: 750}, {min: 50, max: 500});

    // Create the graph
    plotLineGraph(funcs, countryData, selectedCountry)
  }

  function plotLineGraph(funcs, countryData, country) {
    
    let line = d3.line()
      .x((d) => funcs.x(d))
      .y((d) => funcs.y(d));

    // Add the background
    svgLineGraph.append("rect")
      .attr("x", "100")
      .attr("y", "50")
      .attr("width", "650")
      .attr("height", "450")
      .attr("fill", "#eaf2f8")
      .attr("opacity", '0.5');

    // Create a line using the given data
    svgLineGraph.append('path')
      .datum(countryData)
      .attr("fill", "none")
      .attr("stroke", " #1a5276")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 6)
      .attr("d", line)

      //Add a tooltip
      .on("mouseover", (d) => {
        tooltipDiv.transition()
          .duration(200)
          .style("opacity", 1)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");

      })
      .on("mouseout", (d) => {
        tooltipDiv.transition()
          .duration(500)
          .style("opacity", 0);
      });
    
      // Add the labels
      lineGraphLables();
  }

  // Function to create lables for the line chart
  function lineGraphLables() {
    svgLineGraph.append('text')
      .attr('x', 50)
      .attr('y', 30)
      .style('font-size', '22pt')
      .text("Population Growth By Country");

    svgLineGraph.append('text')
      .attr('x', 400)
      .attr('y', 550)
      .style('font-size', '15pt')
      .text('Year');

    svgLineGraph.append('text')
      .attr('transform', 'translate(50, 400)rotate(-90)')
      .style('font-size', '15pt')
      .text('Population (in millions)');
  }

  // draw the axes and ticks
  function drawAxes(limits, x, y, svg, rangeX, rangeY) {
    // return x value from a row of data
    let xValue = function(d) { return +d[x]; }

    // function to scale x value
    let xScale = d3.scaleLinear()
      .domain([limits.xMin, limits.xMax]) // give domain buffer room
      .range([rangeX.min, rangeX.max]);

    // xMap returns a scaled x value from a row of data
    let xMap = function(d) { return xScale(xValue(d)); };

    // plot x-axis at bottom of SVG
    let xAxis = d3.axisBottom().scale(xScale);
    svg.append("g")
      .attr('transform', 'translate(0, ' + rangeY.max + ')')
      .call(xAxis);

    // return y value from a row of data
    let yValue = function(d) { return +d[y]}

    // function to scale y
    let yScale = d3.scaleLinear()
      .domain([limits.yMax + (limits.yMax/20), limits.yMin]) // give domain buffer
      .range([rangeY.min, rangeY.max]);

    // yMap returns a scaled y value from a row of data
    let yMap = function (d) { return yScale(yValue(d)); };

    // plot y-axis at the left of SVG
    let yAxis = d3.axisLeft().scale(yScale);
    svg.append('g')
      .attr('transform', 'translate(' + rangeX.min + ', 0)')
      .call(yAxis);

    // return mapping and scaling functions
    return {
      x: xMap,
      y: yMap,
      xScale: xScale,
      yScale: yScale
    };
  }


  function makeScatterPlot() {
    // get arrays of fertility rate data and life Expectancy data
    let fertility_rate_data = data.map((row) => parseFloat(row["fertility_rate"]));
    let life_expectancy_data = data.map((row) => parseFloat(row["life_expectancy"]));

    // find data limits
    let axesLimits = findMinMax(fertility_rate_data, life_expectancy_data);

     // draw axes and return scaling + mapping functions
     let mapFunctions = drawAxes(axesLimits, "fertility_rate", "life_expectancy", svgTooltip, {min: 50, max: 300}, {min: 50, max: 220});

     // plot data as points and add tooltip functionality
     plotData(mapFunctions);

  }

  function plotData(map) {

    // get population data as array
    let pop_data = data.map((row) => +row["pop_mlns"]);
    let pop_limits = d3.extent(pop_data);

    // make size scaling function for population
    d3.scaleLinear()
      .domain([pop_limits[0], pop_limits[1]])
      .range([3, 20]);

    // mapping functions
    let xMap = map.x;
    let yMap = map.y;


    // append data to SVG and plot as points
    svgTooltip.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
        .attr('cx', xMap)
        .attr('cy', yMap)
        .attr('r', 1)
        .style('opacity', 0.6)
        .attr('fill', "#a93226");

    // draw title and axes labels
    toolTipLabels();
  }

  // make title and axes labels
  function toolTipLabels() {

    svgTooltip.append('text')
      .attr('x', 50)
      .attr('y', 30)
      .style('font-size', '10pt')
      .text("Life Expectancy vs. Fertility Rate of all countries");

    svgTooltip.append('text')
      .attr('x', 90)
      .attr('y', 250)
      .style('font-size', '8pt')
      .text('Fertility Rates (Avg Children/Woman)');

    svgTooltip.append('text')
      .attr('transform', 'translate(15, 180)rotate(-90)')
      .style('font-size', '8pt')
      .text('Life Expectancy (yrs)');
  }

  // find min and max for arrays of x and y
  function findMinMax(x, y) {

    // get min/max x values
    let xMin = d3.min(x);
    let xMax = d3.max(x);

    // get min/max y values
    let yMin = d3.min(y);
    let yMax = d3.max(y);
	
    // return formatted min/max data as an object
    return {
      xMin : xMin,
      xMax : xMax,
      yMin : yMin,
      yMax : yMax
    }
  }
})();