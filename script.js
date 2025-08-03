
let dataGlobal;
let currentScene = 0;                    
const scenes = [scene1, scene2, scene3]; 

const margin = {top: 50, right: 50, bottom: 60, left: 80};
const W = 820 - margin.left - margin.right;
const H = 560 - margin.top  - margin.bottom;

const svg = d3.select("#chart-area").append("svg")
              .attr("width",  W + margin.left + margin.right)
              .attr("height", H + margin.top  + margin.bottom);

const g = svg.append("g")
             .attr("transform", `translate(${margin.left},${margin.top})`);

const xAxisG = g.append("g").attr("transform", `translate(0,${H})`);
const yAxisG = g.append("g");

svg.append("text")
   .attr("x", W/2 + margin.left)
   .attr("y", H + margin.top + 45)
   .attr("text-anchor", "middle")
   .attr("font-weight","bold")
   .text("Income (GDP per capita, log scale)");

svg.append("text")
   .attr("transform","rotate(-90)")
   .attr("x", -(H/2) - margin.top)
   .attr("y", 18)
   .attr("text-anchor","middle")
   .attr("font-weight","bold")
   .text("Life expectancy (years)");

const tooltip = d3.select("#tooltip");

let x, y, r, colour;

d3.csv("data.csv").then(raw => {
  raw.forEach(d=>{
    d.Country   = d.country;
    d.Continent = d.continent;
    d.Income    = +d.gdpPercap;
    d.LifeExp   = +d.lifeExp;
    d.Pop       = +d.pop;
  });
  dataGlobal = raw;
  initScales();
  initLegend();
  renderCircles(dataGlobal, ()=>true);
  scene1();                              
});

function initScales(){
  x = d3.scaleLog().domain([100, d3.max(dataGlobal,d=>d.Income)]).nice().range([0,W]);
  y = d3.scaleLinear().domain([d3.min(dataGlobal,d=>d.LifeExp)-5, d3.max(dataGlobal,d=>d.LifeExp)]).nice().range([H,0]);
  r = d3.scaleSqrt().domain([0,d3.max(dataGlobal,d=>d.Pop)]).range([4,28]);
  colour = d3.scaleOrdinal(d3.schemeTableau10);
  xAxisG.call(d3.axisBottom(x).ticks(10,"~s"));
  yAxisG.call(d3.axisLeft(y));
}

function initLegend(){
  const legend = svg.append("g").attr("transform",`translate(${W - 110},${margin.top})`);
  Array.from(new Set(dataGlobal.map(d=>d.Continent))).sort()
    .forEach((c,i)=>{
      legend.append("rect")
            .attr("x",0).attr("y",i*20).attr("width",12).attr("height",12)
            .attr("fill",colour(c));
      legend.append("text")
            .attr("x",18).attr("y",i*20+10)
            .attr("alignment-baseline","middle")
            .style("font-size","12px")
            .text(c);
    });
}

function renderCircles(dat, highFn){
  const sel = g.selectAll("circle").data(dat, d=>d.Country);

  sel.enter().append("circle")
      .attr("r",0)
      .attr("cx",d=>x(d.Income))
      .attr("cy",d=>y(d.LifeExp))
      .attr("fill",d=>colour(d.Continent))
      .style("cursor","pointer")
      .on("mouseover",(e,d)=> {
          tooltip.style("opacity",1)
                 .html(`<strong>${d.Country}</strong><br>
                        Income: ${d3.format("$,.0f")(d.Income)}<br>
                        Life Exp: ${d.LifeExp}`)
                 .style("left", (e.pageX+12)+"px")
                 .style("top",  (e.pageY-28)+"px");})
      .on("mouseout", ()=> tooltip.style("opacity",0))
    .merge(sel)
      .transition().duration(800)
      .attr("cx",d=>x(d.Income))
      .attr("cy",d=>y(d.LifeExp))
      .attr("r", d=>r(d.Pop))
      .attr("opacity",d=> highFn(d)?0.9:0.12);

  sel.exit().transition().duration(300).attr("r",0).remove();
}

const anno = d3.select("#annotations");
const cutoffLine = g.append("line")
                    .attr("class","cutoff")
                    .attr("y1",0).attr("y2",H)
                    .attr("stroke","#444")
                    .attr("stroke-dasharray","4 4")
                    .style("opacity",0);

function scene1(){
  anno.html("<p><strong>Scene 1 – Global picture.</strong> \
Each country is represented by a bubble with its size representing population. Colours indicate continents.</p>");
  cutoffLine.style("opacity",0);
  renderCircles(dataGlobal, ()=>true);
  toggleFilters(false,false);
}

function scene2(){
  const TH = 1000;
  const poor   = dataGlobal.filter(d=>d.Income<TH);
  const share  = d3.sum(poor,d=>d.Pop)/d3.sum(dataGlobal,d=>d.Pop);
  const median = d3.median(poor,d=>d.LifeExp);

  anno.html(
    `<p><strong>Scene 2 – Poverty highlight</strong><br>
     <strong>${d3.format(".0%")(share)}</strong> of the world lives on \
     less than <strong>$1000</strong> per capita. <br>
     Their median life expectancy is <strong>${median.toFixed(1)} years. Let that sink in. </strong>.</p>`);

  cutoffLine.transition().duration(600)
            .attr("x1",x(TH)).attr("x2",x(TH))
            .style("opacity",1);

  renderCircles(dataGlobal, d=>d.Income<TH);
  toggleFilters(false,false);
}

function scene3(){            
  anno.html(
   `<p><strong>Scene 3 – Explore freely.</strong> \
Filter by continent or adjust the poverty threshold.</p>`);
  cutoffLine.style("opacity",0.2);
  renderCircles(dataGlobal, ()=>true);
  toggleFilters(true,true);    
}

function toggleFilters(showButtons, showSlider){
  d3.select("#filter-buttons").attr("hidden", showButtons ? null : true);
  d3.select("#slider-wrap")   .attr("hidden", showSlider  ? null : true);
}

d3.selectAll(".filter-btn").on("click", function(){
  const c = this.dataset.continent;
  d3.selectAll(".filter-btn").classed("disabled", false);

  if(c==="All"){
    renderCircles(dataGlobal, ()=>true);
    cutoffLine.style("opacity",0.2);
  } else {
    renderCircles(dataGlobal, d=>d.Continent===c);
    d3.select(this).classed("disabled", true);
  }
});

d3.select("#poverty").on("input", function(){
  const cut = +this.value;
  d3.select("#pLabel").text("$"+cut.toLocaleString());
  cutoffLine.attr("x1",x(cut)).attr("x2",x(cut)).style("opacity",0.2);
  renderCircles(dataGlobal, d=>d.Income<cut);
});

d3.select("#next").on("click", ()=> advance(1));
d3.select("#prev").on("click", ()=> advance(-1));

function advance(dir){
  currentScene = (currentScene + dir + scenes.length) % scenes.length;
  scenes[currentScene]();
}
