alter table albums drop constraint if exists albums_wall_layout_check;
alter table albums add constraint albums_wall_layout_check
  check (wall_layout in ('cylinder', 'sphere', 'scatter', 'spiral', 'drift'));
