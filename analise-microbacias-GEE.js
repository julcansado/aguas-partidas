var area_export = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-64.98146352799101, -15.618756677349602],
          [-64.98146352799101, -17.406684657594646],
          [-62.65510854752226, -17.406684657594646],
          [-62.65510854752226, -15.618756677349602]]], null, false),
    geometry = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.MultiPoint(
        [[-72.22541003683502, 0.17098748357813562],
         [-62.71124988058502, 7.967790509716777],
         [-67.97977428333122, -15.379466607291686],
         [-71.14383678333122, -12.82243656777119]]),
    opciones_tramo = 
    /* color: #98ff00 */
    /* shown: false */
    ee.Geometry.MultiPoint(
        [[-67.60896638360924, -14.205013491015604],
         [-66.60921052423424, -11.506130912461725],
         [-66.38948396173424, -11.075183797924478],
         [-66.03792146173424, -10.881048890033135]]);

/** 
 * Script para el análisis de vulnerabilidad 
 * Proyecto Mongabay
 * 
 * Créditos:
 * FAN - RAISG
 * @author E.Mollinedo
 * 
 * ultima atualizacao: junio, 2026
 * Acesso ao script no Earth Engine: https://code.earthengine.google.com/66719cd7a41b74514c6e4f7c9804fd1d
*/ 

// ========================================================================================================
// Layers referencia

var raisg = ee.FeatureCollection('projects/mapbiomas-raisg/MAPBIOMAS-WETLANDS/DATOS-AUXILIARES/VECTORES/REGIONALES/limite-raisg-gdb-20240808')
var raisgImg = ee.Image('projects/mapbiomas-raisg/DATOS_AUXILIARES/RASTERS/limite-raisg-5');


// Cuencas y rios
var macrocuencas = ee.FeatureCollection('projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/VECTOR/cuencas_interes_250901')
                    .filterBounds(geometry)

var hb_lev8 = ee.FeatureCollection("WWF/HydroATLAS/v1/Basins/level08")


// APs y TIs
var ap_nal = ee.FeatureCollection('projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/anps-nacionales_oct2025').filterBounds(macrocuencas)
var ap_subNal = ee.FeatureCollection('projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/anps-departamentales_Oct2025').filterBounds(macrocuencas)
var tis = ee.FeatureCollection('projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/Ti').filterBounds(macrocuencas)



// ==============================================================================================
// Productos MapBiomas - Raisg

var cuencas_agua_MD_Beni = ee.FeatureCollection('projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/RAISG_ANALYSIS_FS/cuencas_l8l5_water_MD_Beni')
var cuencas_agua_Caqueta = ee.FeatureCollection('projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/RAISG_ANALYSIS_FS/cuencas_l8l5_water_Caqueta')
var cuencas_agua_Caroni = ee.FeatureCollection('projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/RAISG_ANALYSIS_FS/cuencas_l8l5_water_Caroni')

var cuencas_agua = cuencas_agua_MD_Beni.merge(cuencas_agua_Caqueta).merge(cuencas_agua_Caroni)

var agua_anual_bo = ee.Image('projects/mapbiomas-public/assets/bolivia/water/collection3/mapbiomas_bolivia_collection3_water_v1')
var agua_anual_pe = ee.Image('projects/mapbiomas-public/assets/peru/water/collection3/mapbiomas_peru_collection3_water_v1')
var agua_anual_co = ee.Image('projects/mapbiomas-public/assets/colombia/water/collection3/mapbiomas_colombia_collection3_water_v1').selfMask()
var agua_anual_ve = ee.Image('projects/mapbiomas-public/assets/venezuela/water/collection3/mapbiomas_venezuela_collection3_water_v2').selfMask()

var agua_anual = ee.ImageCollection([agua_anual_bo, agua_anual_pe, agua_anual_co, agua_anual_ve])

var wetlands_paper = ee.Image('projects/mapbiomas-raisg/MAPBIOMAS-WETLANDS/AmazonWetlandMap').clip(macrocuencas)

var img_aguaCuencas = cuencas_agua.reduceToImage(['w_23_mean'], ee.Reducer.first()).rename('w_23_mean')
            .addBands(cuencas_agua.reduceToImage(['a23_00_abs'],  ee.Reducer.first()).rename('a23_00_abs'))
            .addBands(cuencas_agua.reduceToImage(['n23_00_abs'], ee.Reducer.first()).rename('n23_00_abs'))

Map.addLayer(img_aguaCuencas.select('w_23_mean'),{min:-1200, max:1200, palette:['A3071C','E83F57','white','2791F5','0758A3']},'Agua media-2023',false)
Map.addLayer(img_aguaCuencas.select('a23_00_abs'),{min:-100, max:100, palette:['A3071C','E83F57','white','2791F5','0758A3']},'antropica 2000-2023',false)
Map.addLayer(img_aguaCuencas.select('n23_00_abs'),{min:-1200, max:1200, palette:['A3071C','E83F57','white','2791F5','0758A3']},'natural 2000-2023',false)

var vis_wet = {
        opacity: 1,
        min: 0,
        max: 9,  // CORREGIDO: era 10, debe ser 9
        palette: [
        '000000',  // 0: Non-Wetland
        'd2b48c',  // 1: Tidal Flat
        'ffff99',  // 2: Salt Marsh
        'b2df8a',  // 3: Mangrove
        '89c0db',  // 4: Glacier
        '0000ff',  // 5: Open Water
        'cab2d6',  // 6: Lowland Herbaceous
        'ff7f00',  // 7: Highland Herbaceous
        '7330b4',  // 8: Shrub Floodplain
        '33a02c'   // 9: Forest Floodplain
    ]
    }

Map.addLayer(wetlands_paper.selfMask(), vis_wet,'wetlands-2020', false)

Map.addLayer(agua_anual.select('classification_2000'),{palette:'75B3FA'},'MapBiomas Agua - 2000',false)
Map.addLayer(agua_anual.select('classification_2023'),{palette:'blue'},'MapBiomas Agua - 2023',false)


// Visualizacion layers referencia

// Map.addLayer(ap_nal.style({fillColor: '71cb1240',color: '71cb12',width:0.8}),{},'dpto-ap_nal',false)
Map.addLayer(ap_nal.style({fillColor: '3c954d40',color: '3c954d',width:0.8}),{},'APN-nacional',false)
Map.addLayer(ap_subNal.style({fillColor: '3c954d40',color: '3c954d',width:0.8}),{},'APN-subancional',false)
Map.addLayer(tis.style({fillColor: '65007530',color: '650075',width:0.5}),{},'TIs',false)
Map.addLayer(tis,{},'TIs-nombre',false)



// ============================================================================================
// Minería y deforestacion

var deforestacion = ee.Image('projects/ee-ivesmb/assets/Wetland_Analysis/Article/DeforestationRAISG2000_2020')

var mineria_legal    = ee.FeatureCollection('projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/VECTOR/mineria_legal_ama');
var mineria_ilegal   = ee.FeatureCollection('projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/VECTOR/mineriailegal_pol_filtrado');

var amazonMinningVector = ee.FeatureCollection('projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/VECTOR/amw_2018_2025Q4cumulative')

var mb_amazonia = ee.Image('projects/mapbiomas-raisg/COLECCION6/INTEGRACION/mapbiomas_raisg_panamazonia_collection6_integration-0-2') 
                    .select('classification_2023').eq(30).selfMask()

// Map.addLayer(mineria_legal,{color:'red'},'Mineria legal Raisg - en exploracion',false)
Map.addLayer(mineria_legal.filter(ee.Filter.eq('leyenda', 'concesion sin actividad')),{color:'ffb3b7'},'Mineria legal Raisg - concesion',false)
Map.addLayer(mineria_legal.filter(ee.Filter.eq('leyenda', 'en exploración')),{color:'e8a942'},'Mineria legal Raisg - en exploracion',false)
Map.addLayer(mineria_legal.filter(ee.Filter.eq('leyenda', 'en explotación')),{color:'b6467e'},'Mineria legal Raisg - en explotación',false)
Map.addLayer(mineria_ilegal,{color:'red'},'Mineria ilegal Raisg',false)

Map.addLayer(amazonMinningVector,{color:'red'},'Amazon Mining Watch',false)
Map.addLayer(mb_amazonia,{palette:'red'},'MB_amazonia - minería 2023',false)

Map.addLayer(deforestacion,{min:2000, max:2020, palette:['F5C827','C72E00']},'Deforestacion-Raisg',false)


// layers limites
Map.addLayer(hb_lev8.filterBounds(macrocuencas).style({fillColor:'00000000',width:0.5}),{},'cuencas l8',false)
Map.addLayer(macrocuencas.style({fillColor:'00000000',width:1.2}),{},'Cuencas interés',false)
Map.addLayer(raisg.style({fillColor:'00000000',width:2}),{},'raisg',false)


// ============================================================================================
// Capa de vias

var vias = ee.FeatureCollection('users/marcex001/CAMINOS_Y_VIA_FERREA')
var primarias = vias.filter(ee.Filter.eq('CLASE','PRINCIPAL'))
var secundarias = vias.filter(ee.Filter.eq('CLASE','SECUNDARIO'))

Map.addLayer(primarias,{color:'magenta'},"vias primarias",false)
Map.addLayer(secundarias,{color:'magenta'},"vias secundarias",false)

print(macrocuencas);

// Para ver quantas subbacias foram avaliadas em Beni
var subBacias = ['Beni', 'Caquetá', 'Madre de Dios', 'Caroní'];

subBacias.forEach(function(nome){

  var bacia = macrocuencas.filter(
    ee.Filter.eq('SUB_NAME', nome)
  );

  var pfaf = hb_lev8.filterBounds(bacia);

  print(nome, pfaf.size());

});
