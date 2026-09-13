#############################################################
## Análise da relação entre mudanças na superfície de água ##
## e pressões antrópicas nas macrobacias amazônicas        ##
#############################################################

#### Anthony Barbosa
#### Última atualização: Julho, 2026

###############################################################################
# ANÁLISE DE COMPONENTES PRINCIPAIS (PCA)
#
# Objetivo:
# Avaliar a associação entre mudanças na superfície de água (natural e
# antrópica) e variáveis de pressão antrópica.
###############################################################################

###############################################################################
# 1. Carregar pacotes
###############################################################################

library(dplyr)
library(FactoMineR)
library(factoextra)
library(ggplot2)
library(patchwork)

###############################################################################
# 2. Importar dados
###############################################################################

a = read.table(
  "clipboard",
  header = TRUE,
  sep = "\t"
)

str(a)

###############################################################################
# 3. Transformação logarítmica das variáveis
###############################################################################

vars_log = c(
  "n23_rel_km2",
  "a23_rel_km2",
  "w_23_mean",
  "pct_defor",
  "pct_min_legal",
  "pct_min_ilegal",
  "pct_ap_total",
  "pct_ti",
  "road_density_km_km2"
)

a[vars_log] = lapply(
  a[vars_log],
  function(x) log(x + 1)
)

###############################################################################
# 4. Construção da matriz utilizada na PCA
###############################################################################

dados_pca = a %>%
  select(
    n23_rel_km2,
    a23_rel_km2,
    w_23_mean,
    pct_defor,
    pct_min_legal,
    pct_min_ilegal,
    pct_ap_total,
    pct_ti,
    road_density_km_km2
  )

###############################################################################
# 5. Executar PCA
###############################################################################

pca = PCA(
  dados_pca,
  graph = FALSE
)

summary(pca)

###############################################################################
# 6. Classificar observações segundo os quantis
###############################################################################

classificar_quantis = function(x){
  
  case_when(
    
    x <= quantile(x, 0.20, na.rm = TRUE) ~ "Perda relevante",
    
    x >= quantile(x, 0.80, na.rm = TRUE) ~ "Ganho relevante",
    
    TRUE ~ "Pouca alteração"
    
  )
  
}

a2 = a %>%
  mutate(
    classe = classificar_quantis(n23_rel_km2)
  )

a3 = a %>%
  mutate(
    classe = classificar_quantis(a23_rel_km2)
  )

###############################################################################
# 7. Resultados numéricos da PCA
###############################################################################

scores = as.data.frame(pca$ind$coord)

scores$classe_nat = a2$classe
scores$classe_ant = a3$classe
scores$macrocuenca = a$macrocuenca

coord_ind = pca$ind$coord
coord_var = pca$var$coord
contrib_var = pca$var$contrib
cos2_var = pca$var$cos2
autovalores = pca$eig

###############################################################################
# 8. Biplot - Água natural
###############################################################################

g1 = fviz_pca_biplot(
  
  pca,
  
  habillage = a2$classe,
  
  palette = c(
    "blue",
    "red",
    "grey80"
  ),
  
  label = "var",
  
  repel = TRUE,
  
  pointsize = 2,
  
  col.var = "black"
  
) +
  theme_classic()

###############################################################################
# 9. Distribuição dos scores - Água natural
###############################################################################

g2 = ggplot(
  scores,
  aes(
    Dim.1,
    Dim.2,
    color = macrocuenca,
    shape = classe_nat
  )
) +
  
  geom_hline(
    yintercept = 0,
    linetype = "dashed",
    color = "grey60"
  ) +
  
  geom_vline(
    xintercept = 0,
    linetype = "dashed",
    color = "grey60"
  ) +
  
  geom_point(size = 2) +
  
  theme_classic()

###############################################################################
# 10. Biplot - Água antrópica
###############################################################################

g3 = fviz_pca_biplot(
  
  pca,
  
  habillage = a3$classe,
  
  palette = c(
    "blue",
    "red",
    "grey80"
  ),
  
  label = "var",
  
  repel = TRUE,
  
  pointsize = 2,
  
  col.var = "black"
  
) +
  theme_classic()

###############################################################################
# 11. Distribuição dos scores - Água antrópica
###############################################################################

g4 = ggplot(
  scores,
  aes(
    Dim.1,
    Dim.2,
    color = macrocuenca,
    shape = classe_ant
  )
) +
  
  geom_hline(
    yintercept = 0,
    linetype = "dashed",
    color = "grey60"
  ) +
  
  geom_vline(
    xintercept = 0,
    linetype = "dashed",
    color = "grey60"
  ) +
  
  geom_point(size = 2) +
  
  theme_classic()

###############################################################################
# 12. Painel final
###############################################################################

painel =
  
  g1 +
  g2 +
  g3 +
  g4 +
  
  plot_annotation(
    tag_levels = "A"
  )

painel

###############################################################################
# 13. Exportar figura
###############################################################################

ggsave(
  
  filename = "Painel_PCA_macrocuencas.png",
  
  plot = painel,
  
  width = 18,
  
  height = 14,
  
  units = "in",
  
  dpi = 500,
  
  bg = "white"
  
)


##############
###############################################################################
# MODELOS LINEARES
#
# Objetivo:
# Avaliar a relação entre mudanças na superfície de água (natural e antrópica)
# e diferentes pressões antrópicas, considerando que o efeito dessas pressões
# pode variar entre macrobacias.
#
# Para evitar problemas de multicolinearidade e perda de graus de liberdade,
# cada variável preditora é analisada em um modelo linear independente.
###############################################################################


###############################################################################
# 1. Carregar pacotes
###############################################################################

library(dplyr)
library(tidyr)
library(purrr)
library(broom)
library(emmeans)
library(writexl)


###############################################################################
# 2. Definir variáveis resposta e preditoras
###############################################################################

# Variáveis resposta
ys = c(
  "a23_rel_km2",
  "n23_rel_km2"
)

# Variáveis preditoras
xs = c(
  "pct_defor",
  "pct_min_ilegal",
  "pct_min_legal",
  "pct_ap_total",
  "pct_ti",
  "road_density_km_km2"
)


###############################################################################
# 3. Ajustar automaticamente todos os modelos lineares
###############################################################################
#
# Para cada combinação entre variável resposta e variável preditora é ajustado
# o modelo:
#
# Resposta ~ macrocuenca * Preditor
#
# O termo de interação permite avaliar se o efeito da pressão antrópica muda
# entre as diferentes macrobacias.
###############################################################################

resultados = expand.grid(
  Y = ys,
  X = xs,
  stringsAsFactors = FALSE
) %>%
  
  mutate(
    
    formula = paste(
      Y,
      "~ macrocuenca *",
      X
    ),
    
    modelo = map(
      formula,
      ~ lm(
        as.formula(.x),
        data = a
      )
    )
    
  )


###############################################################################
# 4. Extrair coeficientes dos modelos
###############################################################################
#
# São extraídos:
#
# - coeficientes
# - erro padrão
# - estatística t
# - valor de p
#
# Também é criada uma coluna indicando a significância estatística.
###############################################################################

coeficientes = resultados %>%
  
  mutate(
    tabela = map(modelo, broom::tidy)
  ) %>%
  
  select(
    Y,
    X,
    tabela
  ) %>%
  
  unnest(tabela) %>%
  
  mutate(
    
    significativo = ifelse(
      p.value < 0.05,
      "SIM",
      "NAO"
    ),
    
    sig = case_when(
      
      p.value < 0.001 ~ "***",
      
      p.value < 0.01 ~ "**",
      
      p.value < 0.05 ~ "*",
      
      TRUE ~ ""
      
    )
    
  )


###############################################################################
# 5. Extrair métricas dos modelos
###############################################################################
#
# São obtidas medidas gerais de ajuste:
#
# - R²
# - R² ajustado
# - AIC
# - BIC
# - estatística F
# - valor de p do modelo
###############################################################################

metricas = resultados %>%
  
  mutate(
    glance = map(modelo, broom::glance)
  ) %>%
  
  select(
    Y,
    X,
    glance
  ) %>%
  
  unnest(glance)


###############################################################################
# 6. Comparar inclinações entre macrobacias
###############################################################################
#
# Apenas modelos com interação significativa são avaliados.
#
# Para esses modelos é utilizada a função emtrends(), que estima a inclinação
# da relação entre a variável resposta e o preditor em cada macrobacia.
#
# Essas inclinações representam o efeito da variável preditora em cada grupo.
###############################################################################

resultados = resultados %>%
  
  mutate(
    
    slopes = map2(
      
      modelo,
      
      X,
      
      function(mod, var){
        
        if(anova(mod)[3, "Pr(>F)"] < 0.05){
          
          emtrends(
            
            mod,
            
            ~ macrocuenca,
            
            var = var
            
          ) %>%
            
            broom::tidy()
          
        }else{
          
          NULL
          
        }
        
      }
      
    )
    
  )


###############################################################################
# 7. Organizar resultados das inclinações
###############################################################################

slopes_resultados = resultados %>%
  
  select(
    Y,
    X,
    slopes
  ) %>%
  
  mutate(
    id = row_number()
  ) %>%
  
  unnest(slopes)


###############################################################################
# 8. Exportar resultados
###############################################################################
#
# O arquivo Excel contém:
#
# Resumo
#    Resumo geral dos modelos (quando disponível).
#
# Coeficientes
#    Coeficientes estimados para todos os modelos lineares.
#
# Modelos
#    Métricas gerais de ajuste dos modelos.
#
# Emtrends
#    Comparações entre inclinações das macrobacias.
#
# Slopes
#    Inclinação estimada para cada macrobacia.
###############################################################################

write_xlsx(
  
  list(
    
    Resumo = resumo,
    
    Coeficientes = coeficientes,
    
    Modelos = metricas,
    
    Emtrends = emtrends_resultados,
    
    Slopes = slopes_resultados
    
  ),
  
  "Resultados_modelos.xlsx"
  
)

###############################################################################
# Fim da análise
###############################################################################