import { assocPath, includes, ifElse, split, pipe, concat, clone, pathOr, mergeDeepRight } from 'ramda';
import Vue from 'vue';

const isincludeForDot = includes('.');
const splitForDot = split('.');
const keyArrayForConfig = concat(['config']);

const makePayLoadKeyForData = ifElse(isincludeForDot, splitForDot, key => [key]);
const makePayLoadKeyForConfig = ifElse(isincludeForDot, pipe(splitForDot, keyArrayForConfig), key => ['config', key]);

// const isEmptyMap = map => {
//   return Object.keys(map).length === 0 ? true : false;
// };
// const isMap = map => Object.prototype.toString.call(map) === '[object Object]';

function assocPathPlus(obj, keyPath, value) {
  const indexOrKey = keyPath.shift();
  const deep = keyPath.length;
  // const isObj = typeof obj == 'object';
  const isArray = Array.isArray(obj);

  /*
    尾递归判断
  */
  function setValue(key) {
    if (deep == 0) {
      return value;
    } else {
      return assocPathPlus(obj[key], Array.from(keyPath), value);
    }
  }

  /*
    数组处理逻辑
  */
  function handleArray() {
    if (indexOrKey == '*') {
      for (let index = 0; index < obj.length; index++) {
        obj[index] = setValue(index);
      }
      return obj;
    }
    if (Number.isInteger(indexOrKey * 1)) {
      obj[indexOrKey] = setValue(indexOrKey);
      return obj;
    }
  }

  /*
      对象处理逻辑
    */
  function handleObject() {
    if (indexOrKey == '*') {
      for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
          obj[key] = setValue(key);
        }
      }
    } else {
      obj[indexOrKey] = setValue(indexOrKey);
    }
    return obj;
  }

  return isArray ? handleArray() : handleObject();
}

// TODO  isMerge 是否需要 ????？ 2020-04-30 19:01
const baseActions = {
  setObject: ({ dispatch }, payload) => {
    for (const key in payload) {
      if (Object.hasOwnProperty.call(payload, key)) {
        const data = payload[key];
        dispatch('setData', { key, data });
      }
    }
  },
  // 初始化执行的action
  setData: ({ commit }, payload) => {
    payload.key = makePayLoadKeyForData(payload.key);
    commit('setData', payload);
  },
  setConfig: ({ commit }, payload) => {
    payload.key = makePayLoadKeyForConfig(payload.key);
    commit('setData', payload);
  },
  // 下拉加载后执行的action
  /**
   * @purpose 追加数据
   *
   * @todo
   *    1. TODO 不进行深拷贝会报错(不可以修改store的值在mutations外)
   *    2. 性能待测 2020-02-20 21:01 @miles_fk
   *    3. isMerge 是否需要 ????？
   *    4. restData 是否需要 ????？
   *    5. JSON.stringify      JSON.parse 优化数组不能用
   *
   */
  pushData: ({ commit, state }, payload) => {
    let list = [];

    const keyPathList = makePayLoadKeyForData(payload.key);
    // TODO 待优化  JSON.stringify  - 2020-04-30 19:00
    // JSON.parse(JSON.stringify(this.maintainForm));
    list = clone(pathOr([], keyPathList, state));
    payload.data.forEach(item => {
      list.push(item);
    });

    payload.key = keyPathList;
    commit('setData', { key: payload.key, data: list });
  },
};

// R.assocPath(['a', 'b', 'c'], 42, {a: {b: {c: 0}}}); //=> {a: {b: {c: 42}}}
// 传入的数据也要判断一下，不应该是一个数组或字符串
const baseMutations = {
  setData: (state, payload) => {
    // eslint-disable-next-line prefer-const
    let { key, data, isMerge = false } = payload;
    const [keyType, ...restKeyList] = key;

    // mergeDeepRight({a:100,b:200},{a:300})  {"a": 300, "b": 200}
    if (isMerge) {
      data = mergeDeepRight(state[keyType], data);
      state[keyType] = data;
      return;
    }

    if (restKeyList.length > 0) {
      state[keyType] = assocPathPlus(state[keyType], restKeyList, data);
    } else {
      if (keyType in state) {
        state[keyType] = data;
      } else {
        Vue.set(state, keyType, data);
      }
    }
  },
};

export { baseActions, baseMutations };
