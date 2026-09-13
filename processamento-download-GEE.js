var area_export = 
    /* color: #d63000 */
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
    geometry = /* color: #d63000 */ee.Geometry.MultiPoint(
        [[-72.22541003683502, 0.17098748357813562],
         [-62.71124988058502, 7.967790509716777],
         [-67.97977428333122, -15.379466607291686],
         [-71.14383678333122, -12.82243656777119]]),
    opciones_tramo = /* color: #98ff00 */ee.Geometry.MultiPoint(
        [[-67.60896638360924, -14.205013491015604],
         [-66.60921052423424, -11.506130912461725],
         [-66.38948396173424, -11.075183797924478],
         [-66.03792146173424, -10.881048890033135]]);

/** 
 * Script para análise de vulnerabilidade por microbacias pfaf8
 * Projeto Mongabay / RAISG
 * 
 * Objetivo:
 * Construir uma tabela por microbacia HydroATLAS level 8 contendo:
 * - mudança de água natural e antrópica (2000-2023)
 * - % de TI, APs
 * - % de desmatamento
 * - % de mineração ilegal e legal
 * - densidade de vias
 * 
 * Última atualização: junho, 2026
 * Acesso ao script no Earth Engine: https://code.earthengine.google.com/d5ae3ec0825c6585d7111cb2c8002df5
 */

// ========================================================================================================
// 0. PARÂMETROS GERAIS
// ========================================================================================================

// Escala de trabalho para áreas raster
var scaleAnalise = 30;

// Nome do arquivo de saída
var nomeExport = 'pfaf8_vulnerabilidade_Mongabay_2026';

// Caso queira filtrar apenas pfaf8 que interceptam as macrocuencas
var usarFiltroMacrocuencas = true;

// Se quiser trabalhar apenas com pfaf8 que têm informação em cuencas_agua
var removerPfafSemAgua = false;

// ========================================================================================================
// 1. LAYERS DE REFERÊNCIA
// ========================================================================================================

var raisg = ee.FeatureCollection(
  'projects/mapbiomas-raisg/MAPBIOMAS-WETLANDS/DATOS-AUXILIARES/VECTORES/REGIONALES/limite-raisg-gdb-20240808'
);

var raisgImg = ee.Image(
  'projects/mapbiomas-raisg/DATOS_AUXILIARES/RASTERS/limite-raisg-5'
);

// IMPORTANTE:
// "geometry" precisa existir no seu script. Se não existir, troque por alguma geometria de interesse.
// Ex.: um polígono desenhado no mapa ou macrocuencas.geometry()
var macrocuencas = ee.FeatureCollection(
  'projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/VECTOR/cuencas_interes_250901'
).filterBounds(geometry);

// HydroATLAS level 8
var hb_lev8 = ee.FeatureCollection("WWF/HydroATLAS/v1/Basins/level08");

// APs e TIs
var ap_nal = ee.FeatureCollection(
  'projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/anps-nacionales_oct2025'
).filterBounds(macrocuencas);

var ap_subNal = ee.FeatureCollection(
  'projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/anps-departamentales_Oct2025'
).filterBounds(macrocuencas);

var tis = ee.FeatureCollection(
  'projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/Ti'
).filterBounds(macrocuencas);

// ========================================================================================================
// 2. PRODUTOS DE ÁGUA / WETLANDS
// ========================================================================================================

var cuencas_agua_MD_Beni = ee.FeatureCollection(
  'projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/RAISG_ANALYSIS_FS/cuencas_l8l5_water_MD_Beni'
);
var cuencas_agua_Caqueta = ee.FeatureCollection(
  'projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/RAISG_ANALYSIS_FS/cuencas_l8l5_water_Caqueta'
);
var cuencas_agua_Caroni = ee.FeatureCollection(
  'projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/RAISG_ANALYSIS_FS/cuencas_l8l5_water_Caroni'
);

var cuencas_agua = cuencas_agua_MD_Beni
  .merge(cuencas_agua_Caqueta)
  .merge(cuencas_agua_Caroni);

var agua_anual_bo = ee.Image(
  'projects/mapbiomas-public/assets/bolivia/water/collection3/mapbiomas_bolivia_collection3_water_v1'
);
var agua_anual_pe = ee.Image(
  'projects/mapbiomas-public/assets/peru/water/collection3/mapbiomas_peru_collection3_water_v1'
);
var agua_anual_co = ee.Image(
  'projects/mapbiomas-public/assets/colombia/water/collection3/mapbiomas_colombia_collection3_water_v1'
).selfMask();

var agua_anual = ee.ImageCollection([agua_anual_bo, agua_anual_pe, agua_anual_co]);

var wetlands_paper = ee.Image(
  'projects/mapbiomas-raisg/MAPBIOMAS-WETLANDS/AmazonWetlandMap'
).clip(macrocuencas);

// Imagem de apoio com métricas de água
var img_aguaCuencas = cuencas_agua.reduceToImage(['w_23_mean'], ee.Reducer.first())
  .rename('w_23_mean')
  .addBands(
    cuencas_agua.reduceToImage(['a23_00_abs'], ee.Reducer.first()).rename('a23_00_abs')
  )
  .addBands(
    cuencas_agua.reduceToImage(['n23_00_abs'], ee.Reducer.first()).rename('n23_00_abs')
  );

// ========================================================================================================
// 3. PRESSÕES: DESMATAMENTO, MINERAÇÃO, VIAS
// ========================================================================================================

// Deforestação
var deforestacion = ee.Image(
  'projects/ee-ivesmb/assets/Wetland_Analysis/Article/DeforestationRAISG2000_2020'
);

// Mineração
var mineria_legal = ee.FeatureCollection(
  'projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/VECTOR/mineria_legal_ama'
);

var mineria_ilegal = ee.FeatureCollection(
  'projects/raisg-vulnerabilidad/assets/AUXILIAR-DATA/VECTOR/mineriailegal_pol_filtrado'
);

// Vias
var vias = ee.FeatureCollection('users/marcex001/CAMINOS_Y_VIA_FERREA');
var primarias = vias.filter(ee.Filter.eq('CLASE', 'PRINCIPAL'));
var secundarias = vias.filter(ee.Filter.eq('CLASE', 'SECUNDARIO'));

// ========================================================================================================
// 4. PREPARAÇÃO DAS CAMADAS ANALÍTICAS
// ========================================================================================================

// --------------------------------------------------------------------------------------
// 4.1. Definir pfaf8 de interesse
// --------------------------------------------------------------------------------------

var pfaf8 = ee.FeatureCollection(
  ee.Algorithms.If(
    usarFiltroMacrocuencas,
    hb_lev8.filterBounds(macrocuencas),
    hb_lev8
  )
);

print('Número de pfaf8 selecionadas:', pfaf8.size());

// --------------------------------------------------------------------------------------
// 4.2. Máscara de desmatamento 2000-2020
// --------------------------------------------------------------------------------------
// Assumindo que pixels com valor entre 2000 e 2020 representam ano do desmatamento
var deforMask = deforestacion.gte(2000).and(deforestacion.lte(2020)).selfMask();

// Área desmatada em m² por pixel
var deforAreaImg = ee.Image.pixelArea().updateMask(deforMask).rename('defor_m2');

// --------------------------------------------------------------------------------------
// 4.3. Rasterizar mineração ilegal e legal para cálculo de área
// --------------------------------------------------------------------------------------

// mineração ilegal -> imagem binária
var mineriaIlegalImg = ee.Image().byte().paint(mineria_ilegal, 1).selfMask();
var mineriaIlegalAreaImg = ee.Image.pixelArea()
  .updateMask(mineriaIlegalImg)
  .rename('min_ilegal_m2');

// mineração legal -> imagem binária
var mineriaLegalImg = ee.Image().byte().paint(mineria_legal, 1).selfMask();
var mineriaLegalAreaImg = ee.Image.pixelArea()
  .updateMask(mineriaLegalImg)
  .rename('min_legal_m2');

// ========================================================================================================
// 5. FUNÇÕES AUXILIARES
// ========================================================================================================

// --------------------------------------------------------------------------------------
// 5.1. Área de interseção entre uma feature (pfaf8) e um FeatureCollection
// --------------------------------------------------------------------------------------
function calcIntersectionArea(feature, fc, propName) {
  var geom = feature.geometry();
  
  var interArea = fc
    .filterBounds(geom)
    .map(function(ft) {
      var inter = ft.geometry().intersection(geom, ee.ErrorMargin(1));
      return ee.Feature(null, {
        area_m2: inter.area(1)
      });
    })
    .aggregate_sum('area_m2');
  
  interArea = ee.Number(ee.Algorithms.If(interArea, interArea, 0));
  
  return feature.set(propName, interArea);
}

// --------------------------------------------------------------------------------------
// 5.2. Soma de área de um raster mascarado dentro da feature
// --------------------------------------------------------------------------------------
function calcRasterArea(feature, imageArea, propName) {
  var geom = feature.geometry();
  
  var stat = imageArea.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geom,
    scale: scaleAnalise,
    maxPixels: 1e13,
    bestEffort: true
  });
  
  var area = ee.Number(stat.get(imageArea.bandNames().get(0)));
  area = ee.Number(ee.Algorithms.If(area, area, 0));
  
  return feature.set(propName, area);
}

// --------------------------------------------------------------------------------------
// 5.3. Comprimento de linhas dentro da feature
// --------------------------------------------------------------------------------------
function calcLineLength(feature, fcLinhas, propName) {
  var geom = feature.geometry();
  
  var len = fcLinhas
    .filterBounds(geom)
    .map(function(ft) {
      var inter = ft.geometry().intersection(geom, ee.ErrorMargin(1));
      return ee.Feature(null, {
        len_m: inter.length(1)
      });
    })
    .aggregate_sum('len_m');
  
  len = ee.Number(ee.Algorithms.If(len, len, 0));
  
  return feature.set(propName, len);
}

// --------------------------------------------------------------------------------------
// 5.4. Extrair métricas de água da coleção cuencas_agua para cada pfaf8
// Estratégia: pegar a primeira feição de cuencas_agua que intersecta a pfaf8
// --------------------------------------------------------------------------------------
function addWaterMetrics(feature) {
  var geom = feature.geometry();
  
  var match = cuencas_agua.filterBounds(geom).first();
  
  var w_23_mean = ee.Algorithms.If(match, ee.Feature(match).get('w_23_mean'), null);
  var a23_00_abs = ee.Algorithms.If(match, ee.Feature(match).get('a23_00_abs'), null);
  var n23_00_abs = ee.Algorithms.If(match, ee.Feature(match).get('n23_00_abs'), null);
  
  return feature.set({
    w_23_mean: w_23_mean,
    a23_00_abs: a23_00_abs,
    n23_00_abs: n23_00_abs
  });
}

// --------------------------------------------------------------------------------------
// 5.5. Encontrar macrocuenca principal associada a cada pfaf8
// --------------------------------------------------------------------------------------
function addMacrocuencaName(feature) {
  var geom = feature.geometry();
  
  var macro = macrocuencas.filterBounds(geom).first();
  
  // tenta alguns nomes possíveis
  var macro_name = ee.Algorithms.If(
    macro,
    ee.Algorithms.If(
      ee.Feature(macro).propertyNames().contains('nombre'),
      ee.Feature(macro).get('nombre'),
      ee.Algorithms.If(
        ee.Feature(macro).propertyNames().contains('name'),
        ee.Feature(macro).get('name'),
        ee.Algorithms.If(
          ee.Feature(macro).propertyNames().contains('NOMBRE'),
          ee.Feature(macro).get('NOMBRE'),
          'macrocuenca'
        )
      )
    ),
    null
  );
  
  return feature.set('macrocuenca', macro_name);
}

// ========================================================================================================
// 6. CONSTRUÇÃO DA TABELA POR PFAF8
// ========================================================================================================

var pfaf8_stats = pfaf8.map(function(ft) {
  
  // ------------------------------------------------------------------------------------
  // 6.1. Área total da pfaf8
  // ------------------------------------------------------------------------------------
  var area_m2 = ft.geometry().area(1);
  var area_km2 = ee.Number(area_m2).divide(1e6);
  
  ft = ft.set({
    area_m2: area_m2,
    area_km2: area_km2
  });
  
  // ------------------------------------------------------------------------------------
  // 6.2. Métricas de água
  // ------------------------------------------------------------------------------------
  ft = addWaterMetrics(ft);
  
  // ------------------------------------------------------------------------------------
  // 6.3. Nome/identificação da macrocuenca
  // ------------------------------------------------------------------------------------
  ft = addMacrocuencaName(ft);
  
  // ------------------------------------------------------------------------------------
  // 6.4. Área de TI e APs
  // ------------------------------------------------------------------------------------
  ft = calcIntersectionArea(ft, tis, 'ti_area_m2');
  ft = calcIntersectionArea(ft, ap_nal, 'ap_nal_area_m2');
  ft = calcIntersectionArea(ft, ap_subNal, 'ap_sub_area_m2');
  
  // ------------------------------------------------------------------------------------
  // 6.5. Área de desmatamento e mineração
  // ------------------------------------------------------------------------------------
  ft = calcRasterArea(ft, deforAreaImg, 'defor_area_m2');
  ft = calcRasterArea(ft, mineriaIlegalAreaImg, 'min_ilegal_area_m2');
  ft = calcRasterArea(ft, mineriaLegalAreaImg, 'min_legal_area_m2');
  
  // ------------------------------------------------------------------------------------
  // 6.6. Comprimento de vias
  // ------------------------------------------------------------------------------------
  ft = calcLineLength(ft, primarias, 'vias_prim_m');
  ft = calcLineLength(ft, secundarias, 'vias_sec_m');
  
  // ------------------------------------------------------------------------------------
  // 6.7. Percentuais e densidades
  // ------------------------------------------------------------------------------------
  var ti_area = ee.Number(ft.get('ti_area_m2'));
  var ap_nal_area = ee.Number(ft.get('ap_nal_area_m2'));
  var ap_sub_area = ee.Number(ft.get('ap_sub_area_m2'));
  var defor_area = ee.Number(ft.get('defor_area_m2'));
  var min_ilegal_area = ee.Number(ft.get('min_ilegal_area_m2'));
  var min_legal_area = ee.Number(ft.get('min_legal_area_m2'));
  var vias_prim_m = ee.Number(ft.get('vias_prim_m'));
  var vias_sec_m = ee.Number(ft.get('vias_sec_m'));
  
  var ap_total_area = ap_nal_area.add(ap_sub_area);
  
  var pct_ti = ti_area.divide(area_m2).multiply(100);
  var pct_ap_nal = ap_nal_area.divide(area_m2).multiply(100);
  var pct_ap_sub = ap_sub_area.divide(area_m2).multiply(100);
  var pct_ap_total = ap_total_area.divide(area_m2).multiply(100);
  var pct_defor = defor_area.divide(area_m2).multiply(100);
  var pct_min_ilegal = min_ilegal_area.divide(area_m2).multiply(100);
  var pct_min_legal = min_legal_area.divide(area_m2).multiply(100);
  
  var vias_total_m = vias_prim_m.add(vias_sec_m);
  var vias_total_km = vias_total_m.divide(1000);
  var road_density_km_km2 = vias_total_km.divide(area_km2);
  
  // ------------------------------------------------------------------------------------
  // 6.8. Padronizar mudança de água por área da bacia
  // ------------------------------------------------------------------------------------
  var n23_00_abs = ft.get('n23_00_abs');
  var a23_00_abs = ft.get('a23_00_abs');
  var w_23_mean = ft.get('w_23_mean');
  
  var n23_rel = ee.Algorithms.If(
    n23_00_abs,
    ee.Number(n23_00_abs).divide(area_km2),
    null
  );
  
  var a23_rel = ee.Algorithms.If(
    a23_00_abs,
    ee.Number(a23_00_abs).divide(area_km2),
    null
  );
  
  // ------------------------------------------------------------------------------------
  // 6.9. Variáveis binárias de tendência
  // ------------------------------------------------------------------------------------
  var perde_agua_natural = ee.Algorithms.If(
    n23_00_abs,
    ee.Number(n23_00_abs).lt(0),
    null
  );
  
  var ganha_agua_antropica = ee.Algorithms.If(
    a23_00_abs,
    ee.Number(a23_00_abs).gt(0),
    null
  );
  
  // ------------------------------------------------------------------------------------
  // 6.10. Salvar tudo
  // ------------------------------------------------------------------------------------
  ft = ft.set({
    ap_total_area_m2: ap_total_area,
    
    pct_ti: pct_ti,
    pct_ap_nal: pct_ap_nal,
    pct_ap_sub: pct_ap_sub,
    pct_ap_total: pct_ap_total,
    pct_defor: pct_defor,
    pct_min_ilegal: pct_min_ilegal,
    pct_min_legal: pct_min_legal,
    
    vias_total_m: vias_total_m,
    vias_total_km: vias_total_km,
    road_density_km_km2: road_density_km_km2,
    
    n23_rel_km2: n23_rel,
    a23_rel_km2: a23_rel,
    
    perde_agua_natural: perde_agua_natural,
    ganha_agua_antropica: ganha_agua_antropica
  });
  
  return ft;
});

// ========================================================================================================
// 7. FILTROS OPCIONAIS
// ========================================================================================================

// Remover pfaf sem informação de água, se desejar
pfaf8_stats = ee.FeatureCollection(
  ee.Algorithms.If(
    removerPfafSemAgua,
    pfaf8_stats.filter(ee.Filter.notNull(['n23_00_abs', 'a23_00_abs'])),
    pfaf8_stats
  )
);

// ========================================================================================================
// 8. VISUALIZAÇÃO
// ========================================================================================================

// Visualizar pfaf8 com valores de perda/ganho de água natural e antrópica
var pfaf8_nat_img = pfaf8_stats.reduceToImage(['n23_rel_km2'], ee.Reducer.first());
var pfaf8_ant_img = pfaf8_stats.reduceToImage(['a23_rel_km2'], ee.Reducer.first());

Map.centerObject(macrocuencas, 6);

Map.addLayer(
  pfaf8_nat_img,
  {min: -1, max: 1, palette: ['A3071C', 'E83F57', 'FFFFFF', '2791F5', '0758A3']},
  'PFAF8 - mudança água natural padronizada',
  false
);

Map.addLayer(
  pfaf8_ant_img,
  {min: -1, max: 1, palette: ['A3071C', 'E83F57', 'FFFFFF', '2791F5', '0758A3']},
  'PFAF8 - mudança água antrópica padronizada',
  false
);

// Limites
Map.addLayer(
  pfaf8.style({fillColor: '00000000', color: 'black', width: 0.5}),
  {},
  'pfaf8',
  false
);

Map.addLayer(
  macrocuencas.style({fillColor: '00000000', color: 'yellow', width: 1.5}),
  {},
  'macrocuencas',
  true
);

// ========================================================================================================
// 9. INSPEÇÃO DA TABELA
// ========================================================================================================

print('Tabela final por pfaf8:', pfaf8_stats.limit(10));
print('Número final de pfaf8:', pfaf8_stats.size());

// ========================================================================================================
// 10. EXPORTAÇÃO
// ========================================================================================================

Export.table.toDrive({
  collection: pfaf8_stats,
  description: nomeExport,
  fileFormat: 'CSV'
});
