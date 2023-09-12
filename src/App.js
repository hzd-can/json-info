import logo from './logo.ico';
import './App.css';

import React, { Component } from 'react';
import QRCode from 'qrcode.react';
import clipboardCopy from 'clipboard-copy';
import yaml from 'js-yaml';
import JSON5 from 'json5';

// 事件总线类
class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (listener) => listener !== callback
      );
    }
  }
}

const gEventBus = new EventBus();

class JsonTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pageWidth : {},
      collapsed: {}, // 保存每个属性的折叠状态
      visabled: {},
    };
  }

  componentDidMount() {
    const eventBus = this.props.bus;
    eventBus.on('resetSignal', this.handleClear);
  }

  componentWillUnmount() {
    const eventBus = this.props.bus;
    eventBus.off('resetSignal', this.handleClear);
  }

  toggleCollapse = (key) => {
    this.setState((prevState) => {
      const isCollapsed = prevState.collapsed[key] === undefined ? !this.props.collapsed : !prevState.collapsed[key];
      return {
        collapsed: {
          ...prevState.collapsed,
          [key]: isCollapsed,
        },
      };
    });
  };

  setVisable = (key) => {
    this.setState((prevState) => {
      const isVisable = prevState.visabled[key] === undefined ? !this.props.visabled : !prevState.visabled[key];
      return {
        visabled: {
          ...prevState.visabled,
          [key]: isVisable,
        },
      };
    });
  };

  handleWidthChange = (key, event) => {
    this.setState((prevState) => {
      const newWidth = event.target.value + '%';
      return {
        pageWidth:{
          ...prevState.pageWidth,
          [key]: newWidth,
        }
      }
    });
  };

  handleClear = (key) =>{
    this.setState({ [key]: {}});
  };

  renderRow = (key, value, columnWidth, parent) => {
    const { visabled, pageWidth, collapsed } = this.state;
    if (typeof value === 'object' && value !== null) {
      const isCollapsed = collapsed[key] === undefined ? this.props.collapsed : collapsed[key];
      const iPageWidth = pageWidth[key] === undefined ? '100%' : pageWidth[key];
      const isVisabled = visabled[key] === undefined ? this.props.visabled : visabled[key];
      const parentKey = parent+"['" + key + "']";
      const eventBus = this.props.bus;

      if(this.props.col || Array.isArray(value)){

        return (
          <tr key={key}>
            <td style={cellStyle}>{key}</td>
            <table style={{...tableStyle, width: iPageWidth}} key={key} >
            <td style={{ whiteSpace: 'nowrap' }}>
              <button style={commonTextStyle} onClick={() => this.toggleCollapse(key)}>{isCollapsed ? '○' : '●'}</button>
              <button style={commonTextStyle} onClick={() => this.setVisable(key)}>{isVisabled ? '+' : '-'}</button>
              <button style={commonTextStyle} onClick={() => handleCopyClick(value)}>Copy</button>
              <button style={commonTextStyle} onClick={() => gEventBus.emit('favAddSignal', parentKey)}>Fav</button>
              <input type="range" id={key} min="100" max="400" value={parseInt(iPageWidth)} onChange={(event)=>this.handleWidthChange(key, event)}/>
              <label style={commonTextStyle}>{parentKey.replaceAll("'", "")}</label> 
              {!isVisabled ? '' : <label style={commonTextStyle}>{JSON5.stringify(value, null, 0)}</label>}
              {isVisabled ? '' : <JsonTable data={value} collapsed={this.props.collapsed} col={isCollapsed} visabled={isVisabled} parent={parentKey} bus={eventBus}/>}
            </td>
          </table>
          </tr>
        );
      }
      else{
        return (
          <td style={{width: columnWidth}} key={key}>
            <table style={{...tableStyle, width: iPageWidth}}>
              <tr style={cellStyle}>{key}</tr>
              <tr style={{width: '0%'}}>
                <button style={commonTextStyle} onClick={() => this.toggleCollapse(key)}> {isCollapsed ? '○' : '●'}</button>
                <button style={commonTextStyle} onClick={() => this.setVisable(key)}>{isVisabled ? '+' : '-'}</button>
                <button style={commonTextStyle} onClick={() => handleCopyClick(value)}>Copy</button>
                <button style={commonTextStyle} onClick={() => gEventBus.emit('favAddSignal', parentKey)}>Fav</button>
                <input type="range" id={key} min="100" max="400" value={parseInt(iPageWidth)} onChange={(event)=>this.handleWidthChange(key, event)}/>    
                <label style={commonTextStyle}>{parentKey.replaceAll("'", "")}</label> 
                {!isVisabled ? '' : <label style={commonTextStyle}>{JSON5.stringify(value, null, 0)}</label>}
              </tr>
              <tr>
                {isVisabled ? '' : <JsonTable data={value} collapsed={this.props.collapsed} col={isCollapsed} visabled={isVisabled} parent={parentKey} bus={eventBus}/>}
              </tr>
            </table>
          </td>
        );        
      }
    } else {
        if(this.props.col){
          return (
          <tr key={key} style={{width: '0%'}}>
            <td style={cellStyle}>{key}</td>
            <td style={{...getValueStyle(value), ...cellValueStyle}}>{getValuePrint(value)}</td>
          </tr>);
        }
        else {
          return (
            <td style={{width: columnWidth}} key={key}>
            <table style={{...tableStyle}}>
              <tr style={cellStyle}>{key}</tr>
              <tr style={{...getValueStyle(value), ...cellValueStyle}}>{getValuePrint(value)}</tr>
              </table>
          </td>);
        }
    }
  };

  render() {
    const { data, parent } = this.props;

    const columnWidth = 100 / Object.keys(data).length + '%';

    return (
      <table style={{...tableStyle1}}>
        <tbody>
          {Object.keys(data).map((key) => this.renderRow(key, data[key], columnWidth, parent))}
        </tbody>
      </table>
    );
  }
}

const getValueStyle = (value) => {
  if (typeof value === 'string') {
    return { color: 'DarkOrange', fontFamily: 'Consolas' };
  } else if (typeof value === 'number') {
    return { color: 'blue', fontFamily: 'Consolas' };
  } else if (value === null) {
    return { color: 'black' };
  } else if (typeof value === 'boolean') {
    if(value)
      return { color: 'green', fontFamily: 'Consolas' };
    else
      return { color: 'red', fontFamily: 'Consolas' };
  }
  return {}; // 默认样式
};

const getValuePrint = (value) => {
  if (typeof value === 'number' && value % 1 !== 0) {
    return  value.toFixed(3);
  } else if (value === null) {
    return "null";
  } else if (typeof value === 'boolean') {
    if(value)
      return "true";
    else
     return "false";
  }
  return value
};

const handleCopyClick = (data) => {
  clipboardCopy(yaml.dump(data));
  //clipboardCopy(JSON.stringify(data, null, 2));
  alert(yaml.dump(data));
};

const tableStyle1 = {
  borderCollapse: 'collapse',
  width: '100%',
  border: '1px solid #ddd',
};

const tableStyle = {
  borderCollapse: 'collapse',
  width: '100%',
  border: '0px solid #ddd',
};

const cellStyle = {
  width: '1px', 
  whiteSpace: 'nowrap',
  border: '1px solid #ddd',
  textAlign: 'left',
  backgroundColor: '#f2f2f2',
};

const cellValueStyle = {
  whiteSpace: 'nowrap',
  border: '1px solid #ddd',
  textAlign: 'left',
};

const barcodeContainerStyle = {
  flex: 1,
  textAlign: 'right',
};

const commonTextStyle = {
  display: 'inline-block',
  fontFamily: 'Consolas'
};

const fixedStyle = {
  width: '100%',
  overflowY: 'auto', // 显示垂直滚动条
  whiteSpace: 'nowrap',
  position: 'fixed',
  top: '0px', // 距离页面顶部的距离
  left: '0px', // 距离页面左侧的距离
  backgroundColor: '#fff',
  border: '1px solid #ccc',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  zIndex: 999, // 可选，控制层叠顺序
};

class FavTable extends Component{
  constructor(props) {
    super(props);
    this.eventBus = new EventBus();
    this.state = {
      visabled: true,
      pageWidth: '100%',
      collapsed: false, //this.checkIsMobile(),
    };
  }

  toggleCollapse = () => {
    this.eventBus.emit('resetSignal', 'collapsed');
    this.setState((prevState) => {
      return {
        collapsed: !prevState.collapsed,
      };
    });
  };

  handleWidthChange = (event) => {
    const newWidth = event.target.value + '%';
    this.setState({
      pageWidth: newWidth,
    });
  };

  setVisable = () => {
    this.eventBus.emit('resetSignal', 'visabled');
    this.setState((prevState) => {
      return {
        visabled: !prevState.visabled,
      };
    });
  };

  render() {
    const {visabled, pageWidth, collapsed } = this.state;
    const {data} = this.props;

    const pageStyle = {
      width: pageWidth, // 使用状态中的宽度值
    };

    return (
      <div style={{whiteSpace: 'nowrap' }}>
        <button style={commonTextStyle} onClick={this.toggleCollapse}> {collapsed ? '○' : '●'}</button>
        <button style={commonTextStyle} onClick={this.setVisable}>{!visabled ? '+' : '-'}</button>
        <button style={commonTextStyle} onClick={() => handleCopyClick(data)}>Copy</button>
        <button style={commonTextStyle} onClick={() => gEventBus.emit('favDelSignal', this.props.parent)}>Del</button>
        <button style={commonTextStyle} onClick={() => gEventBus.emit('favAddSignal', this.props.parent)}>Top</button>
        <input type="range" id="widthControl" min="100" max="4000" value={parseInt(pageWidth)} onChange={this.handleWidthChange}/>
        <label style={commonTextStyle}>{this.props.parent.replaceAll("'", "")}</label> 
        {visabled ? '' : <label style={commonTextStyle}>{JSON5.stringify(data, null, 0)}</label>}
        <div style={pageStyle}>
          {!visabled ? '' : <JsonTable data={data} collapsed={collapsed} col={collapsed} visabled={!visabled} parent={this.props.parent} bus={this.eventBus}/>}
        </div>
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.eventBus = new EventBus();
    this.dividerRef = React.createRef();
    this.state = {
      isHovered: false,
      isScrolling: false,
      favourites: {},
      isVisabled: true,
      serverIp: window.location.href,
      pageWidth: '100%',
      online: true,
      collapsed: true, //this.checkIsMobile(),
      data: [{
        状态: '正在加载数据...'
      }]
    };
  }

  handleDelFav = (data) => {
    this.setState((prevState) => {
      console.log(prevState, data);
      const newFav = { ...(prevState.favourites) };
      delete newFav[data];
      return {favourites: {...newFav}};
    });
  };

  handleAddFav = (data) => {
    this.setState((prevState) => {
      return {
        favourites: {[data]: null, ...prevState.favourites}
      };
    });
  };

  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
    document.title = window.location.hostname;
    this.fetchData(); // Fetch data immediately
    this.fetchServerIp();
    gEventBus.on('favAddSignal', this.handleAddFav);
    gEventBus.on('favDelSignal', this.handleDelFav);
    //this.dataInterval = setInterval(this.fetchData, 2000);
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
    gEventBus.off('favAddSignal', this.handleAddFav);
    gEventBus.off('favDelSignal', this.handleDelFav);
    //clearInterval(this.dataInterval);
  }

  fetchData = () => {
    fetch('/data')
    .then((response) => {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        return response.json(); // Parse as JSON
      } else if (contentType && contentType.includes('application/yaml')) {
        return response.text().then((yamlString) => yaml.load(yamlString)); // Parse as YAML
      } else {
        throw new Error('Unsupported content type: ' + contentType);
      }
    })
    .then(data => {
      this.setState({
        online: true,
        data: data ? data : {},
      });
      setTimeout(this.fetchData, 1000);
    })
    .catch(error => {
      this.setState({
        online: false,
      });
      console.error('Error fetching data:', error);
      setTimeout(this.fetchData, 3000);
    });
  }

  toggleCollapse = () => {
    this.eventBus.emit('resetSignal', 'collapsed');
    this.setState((prevState) => {
      return {
        collapsed: !prevState.collapsed,
      };
    });
  };

  handleWidthChange = (event) => {
    const newWidth = event.target.value + '%';
    this.setState({
      pageWidth: newWidth,
    });
  };

  checkIsMobile() {
    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  fetchServerIp() {
    fetch('/getServerIp') // 发送请求到后端 API
      .then((response) => response.json())
      .then((data) => {
        this.setState({ serverIp: 'http://' + `${data.ip}:${data.port}` });
      })
      .catch((error) => {
        console.error('Error fetching server IP:', error);
      });
  }

  renderFav(key, data) {
    return (data == null ? '' : <div key={key}>
      <FavTable data={data} collapsed={false} col={false || Array.isArray(data)} visabled={true} parent={key}/>
    </div>)
  }

  setVisable = () => {
    this.eventBus.emit('resetSignal', 'visabled');
    this.setState((prevState) => {
      const isVisable = !prevState.visabled;
      return {
        visabled: isVisable,
      };
    });
  };

  handleScroll = () => {
    const dividerElement = this.dividerRef.current;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    this.setState({
      isScrolling: (scrollTop > dividerElement.offsetTop || window.scrollX > 1),
    });
  };

  handleMouseEnter = () => {
    this.setState({
      isHovered: true,
    });
  };

  handleMouseLeave = () => {
    this.setState({
      isHovered: false,
    });
  };

  render() {
    const {isHovered, isScrolling, favourites, visabled, serverIp, pageWidth, online, collapsed, data } = this.state;
    
    return (
      <div>
        <div>
        </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="Logo" />
            <h1>实时状态({window.location.hostname}{online ? '在线' : '离线'})</h1>
          </div>
          <div>
            {Object.keys(favourites).map((key) => this.renderFav(key, eval('data' + key)))}
            <hr ref={this.dividerRef}></hr>
          </div>
          <div onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} style={{maxHeight: (isHovered ? '50%' : '10%'), display: isScrolling ? 'block' : 'none', ...fixedStyle}}>
            {Object.keys(favourites).map((key) => this.renderFav(key, eval('data' + key)))}
          </div>

          <button style={commonTextStyle} onClick={this.toggleCollapse}> {collapsed ? '○' : '●'}</button>
          <button style={commonTextStyle} onClick={this.setVisable}>{visabled ? '+' : '-'}</button>
          <button style={commonTextStyle} onClick={() => handleCopyClick(data)}>Copy</button>
          <input type="range" id="widthControl" min="100" max="4000" value={parseInt(pageWidth)} onChange={this.handleWidthChange}/>
          <label style={commonTextStyle}>root</label> 
        <div style={{width: pageWidth}}>
          <JsonTable data={data} collapsed={collapsed} col={collapsed || Array.isArray(data)} visabled={visabled} parent='' bus={this.eventBus}/>
        </div>
        <div style={barcodeContainerStyle}>
            <p><a href={serverIp} target="_blank" rel="noopener noreferrer">{serverIp}</a></p>
            <QRCode value={serverIp} />
        </div>
      </div>
    );
  }
}

export default App;
