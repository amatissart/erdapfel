/* globals _ */
import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Telemetry from 'src/libs/telemetry';
import nconf from '@qwant/nconf-getter';
import ActionButtons from './ActionButtons';
import PoiBlockContainer from './PoiBlockContainer';
import OsmContribution from 'src/components/OsmContribution';
import CategoryList from 'src/components/CategoryList';
import { isFromPagesJaunes, isFromOSM } from 'src/libs/pois';
import { buildQueryString } from 'src/libs/url_utils';
import IdunnPoi from 'src/adapters/poi/idunn_poi';
import Poi from 'src/adapters/poi/poi.js';
import { fire, listen, unListen } from 'src/libs/customEvents';
import { addToFavorites, removeFromFavorites, isInFavorites } from 'src/adapters/store';
import PoiItem from 'src/components/PoiItem';
import { isNullOrEmpty } from 'src/libs/object';
import { DeviceContext } from 'src/libs/device';
import { Flex, Panel, PanelNav, CloseButton } from 'src/components/ui';

const covid19Enabled = (nconf.get().covid19 || {}).enabled;

async function isPoiFavorite(poi) {
  try {
    const storePoi = await isInFavorites(poi);
    return !!storePoi;
  } catch (e) {
    return false;
  }
}

export default class PoiPanel extends React.Component {
  static propTypes = {
    poiId: PropTypes.string.isRequired,
    poi: PropTypes.object,
    poiFilters: PropTypes.object,
    centerMap: PropTypes.bool,
  }

  static defaultProps = {
    poiFilters: {},
  }

  constructor(props) {
    super(props);
    this.state = {
      fullPoi: null,
      isPoiInFavorite: false,
    };
    this.isDirectionActive = nconf.get().direction.enabled;
  }

  componentDidMount() {
    fire('mobile_direction_button_visibility', false);

    // Load poi or pois
    !this.props.pois ? this.loadPoi() : this.loadPois();

    this.storeAddHandler = listen('poi_added_to_favs', poi => {
      if (poi === this.state.fullPoi) {
        this.setState({ isPoiInFavorite: true });
      }
    });

    this.storeRemoveHandler = listen('poi_removed_from_favs', poi => {
      if (poi === this.state.fullPoi) {
        this.setState({ isPoiInFavorite: false });
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.poiId !== prevProps.poiId) {
      this.loadPoi();
    }
  }

  componentWillUnmount() {
    unListen(this.storeAddHandler);
    unListen(this.storeRemoveHandler);
    fire('move_mobile_bottom_ui', 0);
    fire('clean_marker');
    fire('mobile_direction_button_visibility', true);
  }

  loadPois = () => {
    window.execOnMapLoaded(() => {
      fire('add_category_markers', this.props.pois, this.props.poiFilters);
    });
    this.loadPoi();
  }

  loadPoi = async () => {
    const { poiId, centerMap } = this.props;
    const mapOptions = { centerMap };

    // If a POI object is provided before fetching full data,
    // we can update the map immediately for UX responsiveness
    const shallowPoi = this.props.poi && Poi.deserialize(this.props.poi);
    const updateMapEarly = !!shallowPoi;
    if (updateMapEarly) {
      this.updateMapPoi(shallowPoi, mapOptions);
    }

    let poi;
    if (window.hotLoadPoi && window.hotLoadPoi.id === poiId) {
      Telemetry.add(Telemetry.POI_RESTORE);
      poi = new IdunnPoi(window.hotLoadPoi);
      mapOptions.centerMap = true;
    } else {
      poi = await IdunnPoi.poiApiLoad(this.props.poi || { id: poiId });
    }

    // fallback on the simple POI object from the map
    // if Idunn doesn't know this POI
    poi = poi || shallowPoi;

    if (!poi) {
      // @TODO: error message instead of close in case of unrecognized POI
      this.closeAction();
    } else {
      this.setState({
        fullPoi: poi,
      });
      isPoiFavorite(poi).then(isPoiInFavorite => {
        this.setState({ isPoiInFavorite });
      });
      if (!updateMapEarly) {
        this.updateMapPoi(poi, mapOptions);
      }
    }
  }

  updateMapPoi(poi, options = {}) {
    window.execOnMapLoaded(() => {
      if (isNullOrEmpty(this.props.poiFilters)) {
        fire('create_poi_marker', poi);
      } else {
        fire('click_category_marker', poi);
      }
      fire('ensure_poi_visible', poi, options);
    });
  }

  backToFavorite = e => {
    e.stopPropagation();
    Telemetry.add(Telemetry.POI_BACKTOFAVORITE);
    window.app.navigateTo('/favs');
  }

  getBestPoi() {
    return this.state.fullPoi || this.props.poi;
  }

  center = () => {
    const poi = this.getBestPoi();
    Telemetry.sendPoiEvent(poi, 'go');
    fire('fit_map', poi);
  }

  openDirection = () => {
    const poi = this.getBestPoi();
    Telemetry.sendPoiEvent(poi, 'itinerary');
    window.app.navigateTo('/routes/', { poi });
  }

  closeAction = () => {
    window.app.navigateTo('/');
  }

  backToList = e => {
    e.stopPropagation();
    const { poiFilters } = this.props;
    const queryObject = {};
    const mappingParams = {
      query: 'q',
      category: 'type',
    };

    for (const name in poiFilters) {
      if (!poiFilters[name]) {
        continue;
      }
      const key = mappingParams[name];
      queryObject[key || name] = poiFilters[name];
    }

    const params = buildQueryString(queryObject);
    const uri = `/places/${params}`;

    Telemetry.add(Telemetry.POI_BACKTOLIST);
    fire('restore_location');
    window.app.navigateTo(uri);
  }

  onClickPhoneNumber = () => {
    const poi = this.getBestPoi();
    const source = poi.meta && poi.meta.source;
    if (source) {
      Telemetry.sendPoiEvent(poi, 'phone',
        Telemetry.buildInteractionData({
          id: poi.id,
          source,
          template: 'single',
          zone: 'detail',
          element: 'phone',
        })
      );
    }
  }

  toggleStorePoi = () => {
    const poi = this.state.fullPoi;
    Telemetry.sendPoiEvent(poi, 'favorite', { stored: !this.state.isPoiInFavorite });
    if (this.state.isPoiInFavorite) {
      removeFromFavorites(poi);
    } else {
      addToFavorites(poi);
    }
  }

  render() {
    const { poiFilters, isFromFavorite } = this.props;
    const poi = this.getBestPoi();

    if (!poi) {
      // @TODO: we could implement a loading indicator instead
      return null;
    }

    const backAction = poiFilters.category || poiFilters.query
      ? this.backToList
      : isFromFavorite
        ? this.backToFavorite
        : this.closeAction;

    return <DeviceContext.Consumer>
      {isMobile =>
        <Panel
          resizable
          fitContent={['default', 'minimized']}
          className={classnames('poi_panel', {
            'poi_panel--empty-header':
            !isFromPagesJaunes(poi) &&
            !isFromFavorite &&
            (!poiFilters || !poiFilters.category),
          })}
          renderHeader={!isMobile && backAction !== this.closeAction &&
            <PanelNav
              isMobile={isMobile}
              onGoBack={backAction}
              goBackText={_('Display all results')}
            />
          }
        >
          <div className="poi_panel__content">
            <Flex alignItems="flex-start" justifyContent="space-between">
              <PoiItem
                poi={poi}
                className="u-mb-l poi-panel-poiItem"
                withAlternativeName
                withOpeningHours
                onClick={this.center}
              />
              <CloseButton onClick={isMobile ? backAction : this.closeAction} position="topRight" />
            </Flex>
            <div className="u-mb-xs">
              <ActionButtons
                poi={poi}
                isDirectionActive={this.isDirectionActive}
                openDirection={this.openDirection}
                onClickPhoneNumber={this.onClickPhoneNumber}
                isPoiInFavorite={this.state.isPoiInFavorite}
                toggleStorePoi={this.toggleStorePoi}
              />
            </div>
            <div className="poi_panel__fullContent">
              <PoiBlockContainer poi={poi} covid19Enabled={covid19Enabled} />
              {isFromPagesJaunes(poi) &&
              <div className="poi_panel__info-partnership u-text--caption">
                {_('In partnership with')}
                <img src="./statics/images/pj.svg" alt="PagesJaunes" width="80" height="16" />
              </div>
              }
              {poi.id.match(/latlon:/) && <div className="service_panel__categories--poi">
                <h3 className="u-text--smallTitle">
                  {_('Search around this place', 'poi')}
                </h3>
                <CategoryList />
              </div>}
              {isFromOSM(poi) && <OsmContribution poi={poi} />}
            </div>
          </div>
        </Panel>
      }
    </DeviceContext.Consumer>;
  }
}
