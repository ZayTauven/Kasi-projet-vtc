-- p3-mesures M4 (2026-10-23) : catalogue de depart des motifs d'annulation
-- (docs/fiche-motifs-annulation.md §3). Rejouable : n'ajoute que les motifs absents.
-- Production, depuis app-kasi/ :
--   ssh root@<vps> 'cd /opt/kasi && docker exec -i kasi-postgres psql -U <DB_USER> -d <DB_NAME>' < tools/parametrage/motifs-annulation.sql
insert into order_cancel_reason (title, "isEnabled", "userType")
select v.title, true, v.ut::order_cancel_reason_usertype_enum
from (values
 ('Attente trop longue','Rider'),('Le Kasiman est trop loin','Rider'),('J''ai trouvé un autre moyen','Rider'),
 ('Je me suis trompé d''adresse','Rider'),('Le prix a changé','Rider'),('Autre raison','Rider'),
 ('Le client ne répond pas','Driver'),('Adresse de prise en charge introuvable','Driver'),
 ('Colis non conforme à la description','Driver'),('Panne du véhicule','Driver'),('Autre raison','Driver'),
 ('Commande en double','Operator'),('Suspicion de fraude','Operator'),('Incident de sécurité','Operator'),('Autre raison','Operator')
) v(title, ut)
where not exists (select 1 from order_cancel_reason o where o.title = v.title and o."userType"::text = v.ut);
select "userType", count(*) from order_cancel_reason group by 1 order by 1;
