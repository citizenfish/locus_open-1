CREATE OR REPLACE FUNCTION locaria_core.delete_group(parameters JSONB) RETURNS JSONB AS
$$
DECLARE
    ret_var JSONB;
BEGIN

    SET SEARCH_PATH = 'locaria_core', 'public';

END;
$$ LANGUAGE plpgsql